"""Loop-free scientific arrays. Axis k flattens [pulse ×] grain × release layer."""

import numpy as np
import shapely
from pyproj import CRS, Transformer
from scipy.special import ndtr

MEMORY_LIMIT_BYTES = 512 * 1024 * 1024


def check_budget(kernel_count, cells, receptors, directions=1):
    # Conservative allowance for temporary arrays, outputs and serialized grids.
    estimate = int(
        8
        * (
            8 * directions * kernel_count * receptors
            + 12 * cells**2
            + 12 * kernel_count * (cells + 1)
        )
    )
    if estimate > MEMORY_LIMIT_BYTES:
        raise ValueError("Estimated working memory exceeds the 512 MiB computation budget")
    return estimate


def projection(lat, lon):
    local = CRS.from_proj4(f"+proj=aeqd +lat_0={lat} +lon_0={lon} +datum=WGS84 +units=m +no_defs")
    return (
        Transformer.from_crs("EPSG:4326", local, always_xy=True),
        Transformer.from_crs(local, "EPSG:4326", always_xy=True),
    )


def wind_components(speed, wind_from_deg):
    radians = np.deg2rad(wind_from_deg)
    return -speed * np.sin(radians), -speed * np.cos(radians)


def components(height, mass, fractions, settling, layers, diffusivity, initial_spread):
    release = height * (np.arange(layers) + 0.5) / layers
    times = (release[None, :] / settling[:, None]).reshape(-1)
    weights = np.broadcast_to(mass * fractions[:, None] / layers, (fractions.size, layers)).reshape(
        -1
    )
    variance = initial_spread**2 + 2 * diffusivity * times
    return times, weights, variance


def pulse_components(
    starts, durations, rates, heights, fractions, settling, layers, diffusivity, initial_spread
):
    """Axis k flattens pulse × grain × layer. One pulse reproduces components() exactly."""
    release = heights[:, None] * (np.arange(layers) + 0.5)[None, :] / layers  # [pulse, layer]
    times = release[:, None, :] / settling[None, :, None]  # [pulse, grain, layer]
    shape = times.shape
    mass = rates * durations
    weights = np.broadcast_to(mass[:, None, None] * fractions[None, :, None] / layers, shape)
    rate = np.broadcast_to(rates[:, None, None] * fractions[None, :, None] / layers, shape)

    def flat(values):
        return np.broadcast_to(values, shape).reshape(-1)

    times = times.reshape(-1)
    return {
        "times": times,
        "weights": weights.reshape(-1),
        "variance": initial_spread**2 + 2 * diffusivity * times,
        "release_m": flat(release[:, None, :]),
        "settling_m_s": flat(settling[None, :, None]),
        "grain": flat(np.arange(fractions.size)[None, :, None]),
        "start_s": flat(starts[:, None, None]),
        "duration_s": flat(durations[:, None, None]),
        "rate_kg_s": rate.reshape(-1),
    }


def layer_winds(release_heights, level_heights, speeds, wind_from_deg):
    # Interpolate east/north components, not bearings, so 350°/10° do not average to 180°.
    # np.interp holds the end values beyond the profile: no trend extrapolation.
    east, north = wind_components(np.asarray(speeds, float), np.asarray(wind_from_deg, float))
    return (
        np.interp(release_heights, level_heights, east),
        np.interp(release_heights, level_heights, north),
    )


def point_load(east, north, times, weights, variance, wind_east, wind_north):
    # east/north: receptor. Winds: scalar, [direction], or [direction, component]
    # (or 1D [component] if matching times.size). Returns [direction, receptor].
    wind_east = np.asarray(wind_east, dtype=float)
    wind_north = np.asarray(wind_north, dtype=float)
    if wind_east.ndim == 0:
        wind_east = wind_east[None, None]
        wind_north = wind_north[None, None]
    elif wind_east.ndim == 1:
        if wind_east.size == times.size:
            wind_east = wind_east[None, :]
            wind_north = wind_north[None, :]
        else:
            wind_east = wind_east[:, None]
            wind_north = wind_north[:, None]
    dx = east[None, None, :] - (wind_east * times)[..., None]
    dy = north[None, None, :] - (wind_north * times)[..., None]
    exponent = -(dx**2 + dy**2) / (2 * variance[None, :, None])
    return np.sum(np.exp(exponent) * (weights / (2 * np.pi * variance))[None, :, None], axis=1)


def gaussian_intervals(edges, mean, sigma):
    left = (edges[:-1][None, :] - mean[:, None]) / sigma[:, None]
    right = (edges[1:][None, :] - mean[:, None]) / sigma[:, None]
    # Survival-side subtraction avoids catastrophic cancellation in positive tails.
    return np.where(left >= 0, ndtr(-left) - ndtr(-right), ndtr(right) - ndtr(left))


def grid_load(domain_m, cell_m, times, weights, variance, wind_east, wind_north):
    count = int(round(domain_m / cell_m))
    edges = np.linspace(-domain_m / 2, domain_m / 2, count + 1)
    centers = (edges[:-1] + edges[1:]) / 2
    sigma = np.sqrt(variance)
    px = gaussian_intervals(edges, wind_east * times, sigma)
    py = gaussian_intervals(edges, wind_north * times, sigma)
    cell_mass = np.einsum("k,ky,kx->yx", weights, py, px, optimize=True)
    return centers, cell_mass / cell_m**2, float(np.sum(cell_mass))


def trajectories(height, settling, wind_east, wind_north):
    # Deterministic illustrative paths at H/2, not airborne concentrations.
    times = height / 2 / settling
    progress = np.linspace(0, 1, 33)
    elapsed = times[:, None] * progress[None, :]
    points = np.stack(
        (
            wind_east * elapsed,
            wind_north * elapsed,
            np.broadcast_to(height / 2 * (1 - progress), elapsed.shape),
        ),
        axis=-1,
    )
    return times, points


def exposure(
    load, density, inside, municipality, population, cutoffs, quantities, applicability=None
):
    thickness = load * 1000 / density
    reported = inside & (thickness >= 0.5)
    values = np.where(quantities[:, None] == 0, load[None, :], thickness[None, :])
    exceeded = inside[None, :] & (values >= cutoffs[:, None])
    if applicability is not None:
        exceeded &= applicability
    municipality_reported = reported & municipality
    pop_known = population >= 0
    return {
        "thickness": thickness,
        "reported": reported,
        "exceeded": exceeded,
        "municipalities_reported": int(np.count_nonzero(municipality_reported)),
        "indicative_population": int(
            np.sum(np.where(municipality_reported & pop_known, population, 0))
        ),
        "reported_population_unknown": int(np.count_nonzero(municipality_reported & ~pop_known)),
        "criterion_counts": np.count_nonzero(exceeded & municipality[None, :], axis=1),
        "criterion_population": np.sum(
            np.where(exceeded & municipality[None, :] & pop_known, population, 0), axis=1
        ),
    }


def sweep_maxima(east, north, times, weights, variance, speed):
    directions = np.arange(360, dtype=float)
    if speed == 0:
        return point_load(east, north, times, weights, variance, 0, 0)[0], np.zeros(east.size)
    radians = np.deg2rad(directions)[:, None]
    # Rotate receptors into the wind frame. At the vent, the squared distance
    # is exactly (speed * time)**2 for every bearing: sin/cos norm round-off
    # must not invent a preferred direction in an isotropic model.
    along = -np.sin(radians) * east[None, :] - np.cos(radians) * north[None, :]
    across = np.cos(radians) * east[None, :] - np.sin(radians) * north[None, :]
    distance_squared = (along[:, None, :] - speed * times[None, :, None]) ** 2
    distance_squared += across[:, None, :] ** 2
    loads = np.sum(
        np.exp(-distance_squared / (2 * variance[None, :, None]))
        * (weights / (2 * np.pi * variance))[None, :, None],
        axis=1,
    )
    indices = np.argmax(loads, axis=0)
    return loads[indices, np.arange(east.size)], directions[indices]


def observation_metrics(predicted, lower, upper):
    # Range-censored readings have zero error inside their reported interval.
    residual = np.where(
        predicted < lower, predicted - lower, np.where(predicted > upper, predicted - upper, 0)
    )
    observed = np.sqrt(lower * upper)
    valid = (observed > 0) & (predicted > 0)
    factors = np.maximum(predicted[valid] / observed[valid], observed[valid] / predicted[valid])
    missed_positive = (lower > 0) & (predicted <= 0)
    midpoint_residual = predicted - (lower + upper) / 2
    interval_rmse = float(np.sqrt(np.mean(residual**2)))
    return {
        "rmse_mm": interval_rmse,
        "interval_rmse_mm": interval_rmse,
        "interval_mae_mm": float(np.mean(np.abs(residual))),
        "midpoint_rmse_mm": float(np.sqrt(np.mean(midpoint_residual**2))),
        "midpoint_mae_mm": float(np.mean(np.abs(midpoint_residual))),
        "median_factor_error": float(np.median(factors))
        if factors.size and not np.any(missed_positive)
        else None,
        "zero_prediction_positive_observations": int(np.count_nonzero(missed_positive)),
        "range_coverage_fraction": float(np.mean((predicted >= lower) & (predicted <= upper))),
    }


def footprint_iou(east, north, thickness, inverse, reference_geometry):
    east_grid, north_grid = np.meshgrid(east, north)
    lon, lat = inverse.transform(east_grid, north_grid)
    observed = shapely.intersects_xy(reference_geometry, lon, lat)
    predicted = thickness >= 0.5
    intersection = np.count_nonzero(observed & predicted)
    union = np.count_nonzero(observed | predicted)
    return float(intersection / union) if union else None
