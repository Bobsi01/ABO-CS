"""Loop-free scientific arrays. Axis k flattens [pulse ×] grain × release layer."""

import numpy as np
import shapely
from pyproj import CRS, Transformer
from scipy.special import ndtr

MEMORY_LIMIT_BYTES = 512 * 1024 * 1024
SWEEP_DIRECTION_BATCH = 16


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


def components(
    height, mass, fractions, settling, layers, diffusivity, initial_spread, umbrella_radius=None
):
    fractions = np.asarray(fractions, float)
    settling = np.asarray(settling, float)
    release = height * (np.arange(layers) + 0.5) / layers
    times = (release[None, :] / settling[:, None]).reshape(-1)
    base_weights = np.broadcast_to(
        mass * fractions[:, None] / layers, (fractions.size, layers)
    ).reshape(-1)
    if umbrella_radius is not None and umbrella_radius > initial_spread and height >= 3000:
        alpha = 0.40
        fraction_h = (np.arange(layers) + 0.5) / layers
        k = 3.0
        suzuki_raw = (1.0 - fraction_h) * np.exp(k * (fraction_h - 1.0))
        layer_w = suzuki_raw / np.sum(suzuki_raw)

        mat = (fractions[:, None] * layer_w[None, :]).copy()
        flat_w = (mat.reshape(-1)) * mass

        fraction_dist = 0.65 + 0.35 * fraction_h
        release_dist = height * fraction_dist
        times_dist = (release_dist[None, :] / settling[:, None]).reshape(-1)

        times_prox = times
        weights = np.concatenate([flat_w * alpha, flat_w * (1.0 - alpha)])

        base_var_dist = np.broadcast_to(
            (umbrella_radius * fraction_dist)[None, :] ** 2, (fractions.size, layers)
        ).reshape(-1)
        shear_var = (0.75 * umbrella_radius) ** 2
        var_dist = initial_spread**2 + base_var_dist + 2 * diffusivity * times_dist + shear_var
        var_prox = (umbrella_radius / 2.5) ** 2 + 2 * diffusivity * times_prox
        times = np.concatenate([times_prox, times_dist])
        variance = np.concatenate([var_prox, var_dist])
    else:
        weights = base_weights
        variance = initial_spread**2 + 2 * diffusivity * times
    return times, weights, variance


def pulse_components(
    starts,
    durations,
    rates,
    heights,
    fractions,
    settling,
    layers,
    diffusivity,
    initial_spread,
    umbrella_radius=None,
):
    """Axis k flattens pulse × grain × layer. One pulse reproduces components() exactly."""
    fractions = np.asarray(fractions, float)
    settling = np.asarray(settling, float)
    release = (
        heights[:, None, None] * (np.arange(layers) + 0.5)[None, None, :] / layers
    )  # [pulse, 1, layer]
    times = release / settling[None, :, None]  # [pulse, grain, layer]
    shape = times.shape
    mass = rates * durations
    weights = np.broadcast_to(mass[:, None, None] * fractions[None, :, None] / layers, shape)
    rate = np.broadcast_to(rates[:, None, None] * fractions[None, :, None] / layers, shape)

    flat_times = times.reshape(-1)
    flat_weights = weights.reshape(-1)
    flat_release = np.broadcast_to(release, shape).reshape(-1)
    flat_settling = np.broadcast_to(settling[None, :, None], shape).reshape(-1)
    flat_grain = np.broadcast_to(np.arange(fractions.size)[None, :, None], shape).reshape(-1)
    flat_starts = np.broadcast_to(starts[:, None, None], shape).reshape(-1)
    flat_durations = np.broadcast_to(durations[:, None, None], shape).reshape(-1)
    flat_rate = rate.reshape(-1)

    if umbrella_radius is not None and umbrella_radius > initial_spread and np.all(heights >= 3000):
        alpha = 0.40
        fraction_h = (np.arange(layers) + 0.5) / layers  # [layer]
        k = 3.0
        suzuki_raw = (1.0 - fraction_h) * np.exp(k * (fraction_h - 1.0))
        layer_w = suzuki_raw / np.sum(suzuki_raw)

        mat = np.broadcast_to(fractions[None, :, None] * layer_w[None, None, :], shape).copy()
        pulse_weights = mass[:, None, None] * mat
        pulse_rates = rates[:, None, None] * mat

        flat_w = pulse_weights.reshape(-1)
        flat_r = pulse_rates.reshape(-1)

        fraction_dist = 0.65 + 0.35 * fraction_h
        release_dist = heights[:, None, None] * fraction_dist[None, None, :]  # [pulse, 1, layer]
        times_dist = (release_dist / settling[None, :, None]).reshape(-1)
        flat_release_dist = np.broadcast_to(release_dist, shape).reshape(-1)

        base_var_dist = np.broadcast_to(
            (umbrella_radius * fraction_dist)[None, None, :] ** 2, shape
        ).reshape(-1)
        shear_var = (0.75 * umbrella_radius) ** 2
        var_dist = initial_spread**2 + base_var_dist + 2 * diffusivity * times_dist + shear_var
        var_prox = (umbrella_radius / 2.5) ** 2 + 2 * diffusivity * flat_times

        out_times = np.concatenate([flat_times, times_dist])
        out_weights = np.concatenate([flat_w * alpha, flat_w * (1.0 - alpha)])
        out_variance = np.concatenate([var_prox, var_dist])
        out_release = np.concatenate([flat_release, flat_release_dist])
        out_settling = np.concatenate([flat_settling, flat_settling])
        out_grain = np.concatenate([flat_grain, flat_grain])
        out_starts = np.concatenate([flat_starts, flat_starts])
        out_durations = np.concatenate([flat_durations, flat_durations])
        out_rate = np.concatenate([flat_r * alpha, flat_r * (1.0 - alpha)])
        canopy_mask = np.concatenate(
            [np.ones(flat_times.size, dtype=bool), np.zeros(flat_times.size, dtype=bool)]
        )
    else:
        out_times = flat_times
        out_weights = flat_weights
        out_variance = initial_spread**2 + 2 * diffusivity * flat_times
        out_release = flat_release
        out_settling = flat_settling
        out_grain = flat_grain
        out_starts = flat_starts
        out_durations = flat_durations
        out_rate = flat_rate
        canopy_mask = None

    result = {
        "times": out_times,
        "weights": out_weights,
        "variance": out_variance,
        "release_m": out_release,
        "settling_m_s": out_settling,
        "grain": out_grain,
        "start_s": out_starts,
        "duration_s": out_durations,
        "rate_kg_s": out_rate,
    }
    if canopy_mask is not None:
        result["canopy_mask"] = canopy_mask
    return result


def layer_winds(release_heights, level_heights, speeds, wind_from_deg, column_integrated=False):
    east, north = wind_components(np.asarray(speeds, float), np.asarray(wind_from_deg, float))
    if not column_integrated:
        return (
            np.interp(release_heights, level_heights, east),
            np.interp(release_heights, level_heights, north),
        )
    level_heights = np.asarray(level_heights, float)
    order = np.argsort(level_heights)
    z_lev = level_heights[order]
    e_lev = np.asarray(east)[order]
    n_lev = np.asarray(north)[order]

    dz = np.diff(z_lev)
    cum_e = np.concatenate([[0.0], np.cumsum(0.5 * (e_lev[:-1] + e_lev[1:]) * dz)])
    cum_n = np.concatenate([[0.0], np.cumsum(0.5 * (n_lev[:-1] + n_lev[1:]) * dz)])

    h = np.asarray(release_heights, float)
    h_safe = np.maximum(h, 1e-6)

    u_h = np.interp(h, z_lev, e_lev)
    v_h = np.interp(h, z_lev, n_lev)

    idx = np.searchsorted(z_lev, h, side="right") - 1
    idx = np.clip(idx, 0, len(z_lev) - 1)
    within = idx < len(z_lev) - 1
    idx_safe = np.minimum(idx, len(z_lev) - 2)
    z_base = z_lev[idx_safe]
    e_base = e_lev[idx_safe]
    n_base = n_lev[idx_safe]

    int_e_within = cum_e[idx_safe] + 0.5 * (e_base + u_h) * (h - z_base)
    int_n_within = cum_n[idx_safe] + 0.5 * (n_base + v_h) * (h - z_base)
    int_e_above = cum_e[-1] + e_lev[-1] * (h - z_lev[-1])
    int_n_above = cum_n[-1] + n_lev[-1] * (h - z_lev[-1])

    int_e = np.where(within, int_e_within, int_e_above)
    int_n = np.where(within, int_n_within, int_n_above)

    mean_e = np.where(h <= 1e-6, e_lev[0], int_e / h_safe)
    mean_n = np.where(h <= 1e-6, n_lev[0], int_n / h_safe)
    return mean_e, mean_n


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


def sweep_maxima(
    east, north, times, weights, variance, speed, profile_winds=None, reference=0, directions=None
):
    directions = np.arange(360, dtype=float) if directions is None else directions
    if speed == 0 and profile_winds is None:
        return point_load(east, north, times, weights, variance, 0, 0)[0], np.zeros(east.size)
    loads = sweep_loads(
        east, north, times, weights, variance, speed, directions, profile_winds, reference
    )
    indices = np.argmax(loads, axis=0)
    return loads[indices, np.arange(east.size)], directions[indices]


def sweep_loads(east, north, times, weights, variance, speed, directions, profile_winds, reference):
    if profile_winds is not None:
        radians = np.deg2rad(directions - reference)[:, None]
        ue, un = profile_winds
        # Rotate receptors instead of source vectors. At the vent their zero
        # coordinates stay exact, preserving rotational ties under profile shear.
        rotated_e = east[None, :] * np.cos(radians) - north[None, :] * np.sin(radians)
        rotated_n = north[None, :] * np.cos(radians) + east[None, :] * np.sin(radians)
        dx = rotated_e[:, None, :] - (ue * times)[None, :, None]
        dy = rotated_n[:, None, :] - (un * times)[None, :, None]
        return np.sum(
            np.exp(-(dx**2 + dy**2) / (2 * variance[None, :, None]))
            * (weights / (2 * np.pi * variance))[None, :, None],
            axis=1,
        )
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
    return loads


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
