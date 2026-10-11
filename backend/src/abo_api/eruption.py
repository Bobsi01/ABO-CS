"""Finite ash pulse and optional illustrative lava channel; no CFD or thermal solver."""

import json
from pathlib import Path
from time import perf_counter

import numpy as np
import shapely
from scipy.sparse import csr_array
from scipy.sparse.csgraph import dijkstra

from abo_api import kernel, service
from abo_api.contracts import (
    EruptionFrame,
    EruptionRequest,
    EruptionSequence,
    FrameDiagnostics,
    GeoJSON,
    Grid,
    LavaPoint,
    LavaResult,
    PlumeParcel,
    ReceptorResult,
)

TERRAIN_DIRECTORY = Path(__file__).resolve().parents[3] / "frontend" / "public" / "terrain"
GRAVITY = 9.80665


def snapshot_times(duration, max_fall_time, rise_time, count):
    early_count = count // 2
    formation_end = min(duration, rise_time)
    formation_count = max(3, early_count // 2)
    before_end = np.linspace(0, formation_end, formation_count)
    eruption_rest = np.linspace(formation_end, duration, early_count - formation_count + 2)[1:]
    # Exponential spacing resolves early settling without omitting the slowest layer.
    tail_count = count - np.unique(np.concatenate((before_end, eruption_rest))).size
    tail = duration + np.expm1(np.linspace(0, np.log1p(max_fall_time), tail_count + 1))[1:]
    times = np.unique(np.concatenate((before_end, eruption_rest, tail)))
    times[-1] = duration + max_fall_time
    return times


def cumulative_weights(times, falling_times, weights, duration):
    return weights[None, :] * np.clip((times[:, None] - falling_times[None, :]) / duration, 0, 1)


def sequence_grids(times, falling_times, weights, variance, duration, domain_m, count, u_e, u_n):
    edges = np.linspace(-domain_m / 2, domain_m / 2, count + 1)
    sigma = np.sqrt(variance)
    px = kernel.gaussian_intervals(edges, u_e * falling_times, sigma)
    py = kernel.gaussian_intervals(edges, u_n * falling_times, sigma)
    arrived = cumulative_weights(times, falling_times, weights, duration)
    cell_m = domain_m / count
    grids = np.einsum("tk,ky,kx->tyx", arrived, py, px, optimize=True) / cell_m**2
    return (edges[:-1] + edges[1:]) / 2, grids, arrived


def airborne_parcels(
    times,
    height,
    settling,
    layers,
    fractions,
    mass_rate,
    duration,
    u_e,
    u_n,
    diffusivity,
    initial_spread,
    cohorts=6,
):
    release = np.broadcast_to(
        height * (np.arange(layers) + 0.5) / layers, (settling.size, layers)
    ).reshape(-1)
    speeds = np.repeat(settling, layers)
    falling = release / speeds
    lower_age = np.maximum(0, times[:, None] - duration)
    upper_age = np.minimum(times[:, None], falling[None, :])
    active_age = np.maximum(0, upper_age - lower_age)
    ages = (
        lower_age[:, :, None]
        + active_age[:, :, None] * ((np.arange(cohorts) + 0.5) / cohorts)[None, None, :]
    )
    masses = np.broadcast_to(
        active_age[:, :, None]
        * np.repeat(mass_rate * fractions / layers, layers)[None, :, None]
        / cohorts,
        ages.shape,
    )
    heights = np.maximum(0, release[None, :, None] - speeds[None, :, None] * ages)
    radius = np.sqrt(initial_spread**2 + 2 * diffusivity * ages)
    grain = np.broadcast_to(np.repeat(np.arange(settling.size), layers)[None, :, None], ages.shape)
    return ages * u_e, ages * u_n, heights, radius, masses, grain


def fountain_geometry(enabled):
    # A prescribed visual mechanism, NOT an ejecta range or ballistic hazard model.
    flight_time = 6.0
    t = np.linspace(0, flight_time, 33)
    azimuth = np.deg2rad(np.asarray([0, 90, 180, 270]))
    horizontal_speed = 12.0
    height = GRAVITY * flight_time / 2 * t - GRAVITY / 2 * t**2
    paths = np.stack(
        (
            horizontal_speed * np.sin(azimuth)[:, None] * t,
            horizontal_speed * np.cos(azimuth)[:, None] * t,
            np.broadcast_to(np.maximum(0, height), (4, t.size)),
        ),
        axis=-1,
    )
    return (paths if enabled else np.empty((0, 33, 3))), flight_time


def channel_routing(elevation, land_mask, east, north, start, options, duration):
    """Vectorized D8 successor graph; SciPy traverses its one-outgoing-edge route."""
    rows, cols = elevation.shape
    row, col = np.indices(elevation.shape)
    offsets = np.asarray([[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]])
    neighbor_row = row[None, :, :] + offsets[:, 0, None, None]
    neighbor_col = col[None, :, :] + offsets[:, 1, None, None]
    valid = (
        (neighbor_row >= 0) & (neighbor_row < rows) & (neighbor_col >= 0) & (neighbor_col < cols)
    )
    safe_row, safe_col = np.clip(neighbor_row, 0, rows - 1), np.clip(neighbor_col, 0, cols - 1)
    dx, dy = np.diff(east)[0], np.diff(north)[0]
    length = np.hypot(offsets[:, 1] * dx, offsets[:, 0] * dy)
    gradient = (elevation[None, :, :] - elevation[safe_row, safe_col]) / length[:, None, None]
    gradient = np.where(valid, gradient, -np.inf)
    direction = np.argmax(gradient, axis=0)
    slope = np.take_along_axis(gradient, direction[None, :, :], axis=0)[0]
    target_row = np.take_along_axis(safe_row, direction[None, :, :], axis=0)[0]
    target_col = np.take_along_axis(safe_col, direction[None, :, :], axis=0)[0]
    target = target_row * cols + target_col
    edge = (row == 0) | (row == rows - 1) | (col == 0) | (col == cols - 1)
    flowing = (slope > 0) & (land_mask == 1) & ~edge
    indices = np.flatnonzero(flowing)
    sin_slope = slope.ravel()[indices] / np.sqrt(1 + slope.ravel()[indices] ** 2)
    depth = np.cbrt(
        3
        * options.lava_viscosity_pa_s
        * options.lava_effusion_m3_s
        / (options.lava_density_kg_m3 * GRAVITY * sin_slope * options.lava_width_m)
    )
    velocity = options.lava_effusion_m3_s / (options.lava_width_m * depth)
    edge_length = length[direction.ravel()[indices]]
    # Jeffreys speed is along the inclined channel, not its horizontal map projection.
    surface_length = edge_length * np.sqrt(1 + slope.ravel()[indices] ** 2)
    travel_time = surface_length / velocity
    graph = csr_array(
        (travel_time, (indices, target.ravel()[indices])), shape=(rows * cols, rows * cols)
    )
    distances = dijkstra(graph, directed=True, indices=start)
    reachable = np.flatnonzero(np.isfinite(distances))
    path = reachable[np.argsort(distances[reachable], kind="stable")]
    path_row, path_col = np.divmod(path, cols)
    path_e, path_n = east[path_col], north[path_row]
    cumulative_distance = np.concatenate(
        ([0.0], np.cumsum(np.hypot(np.diff(path_e), np.diff(path_n))))
    )
    in_budget = (cumulative_distance <= options.lava_max_distance_m) & (distances[path] <= duration)
    selected = path[in_budget]
    selected_row, selected_col = np.divmod(selected, cols)
    terminal = int(selected[-1])
    terminal_row, terminal_col = divmod(terminal, cols)
    partial = None
    if not np.all(in_budget):
        excluded = np.flatnonzero(~in_budget)[0]
        previous, following = excluded - 1, excluded
        step_distance = cumulative_distance[following] - cumulative_distance[previous]
        step_time = distances[path[following]] - distances[path[previous]]
        distance_fraction = (
            options.lava_max_distance_m - cumulative_distance[previous]
        ) / step_distance
        time_fraction = (duration - distances[path[previous]]) / step_time
        fraction = min(distance_fraction, time_fraction, 1.0)
        stop = "effusion_volume_limit" if time_fraction <= distance_fraction else "distance_limit"
        if fraction > 0:
            previous_z = elevation[path_row[previous], path_col[previous]]
            following_z = elevation[path_row[following], path_col[following]]
            partial = (
                path_e[previous] + fraction * (path_e[following] - path_e[previous]),
                path_n[previous] + fraction * (path_n[following] - path_n[previous]),
                previous_z + fraction * (following_z - previous_z),
                distances[path[previous]] + fraction * step_time,
            )
    elif land_mask[terminal_row, terminal_col] != 1:
        stop = "water"
    elif edge[terminal_row, terminal_col]:
        stop = "terrain_edge"
    else:
        stop = "pit_or_flat"
    depth_field, velocity_field = np.zeros(rows * cols), np.zeros(rows * cols)
    depth_field[indices], velocity_field[indices] = depth, velocity
    # Terminal values use the incoming channel when the terminal has no outflow.
    depths, velocities = depth_field[selected], velocity_field[selected]
    if selected.size > 1 and depths[-1] == 0:
        depths[-1], velocities[-1] = depths[-2], velocities[-2]
    result_e, result_n = east[selected_col], north[selected_row]
    result_z, result_t = elevation[selected_row, selected_col], distances[selected]
    if partial is not None:
        result_e, result_n = np.append(result_e, partial[0]), np.append(result_n, partial[1])
        result_z, result_t = np.append(result_z, partial[2]), np.append(result_t, partial[3])
        depths, velocities = np.append(depths, depths[-1]), np.append(velocities, velocities[-1])
    return result_e, result_n, result_z, result_t, depths, velocities, stop


def lava_result(request, receptors):
    s, options = request.simulation.scenario, request.options
    empty = GeoJSON(features=[])
    warnings = [
        "Illustrative effusion, viscosity, width and density; not measured Mayon inputs",
        "No cooling, crystallization, yield strength, branching, deposition or inundation model",
        "A stopped route means unknown continuation, never a safe downstream region",
    ]
    if not options.include_lava:
        return LavaResult(
            enabled=False,
            path=[],
            stop_reason="not_requested",
            footprint=empty,
            affected_receptor_ids=[],
            warnings=warnings,
        )
    if s.volcano_id != "mayon":
        return LavaResult(
            enabled=False,
            path=[],
            stop_reason="effusive_teaching_model_mayon_only",
            footprint=empty,
            affected_receptor_ids=[],
            warnings=warnings,
        )
    path = TERRAIN_DIRECTORY / "mayon.json"
    if not path.exists():
        return LavaResult(
            enabled=False,
            path=[],
            stop_reason="terrain_unavailable",
            footprint=empty,
            affected_receptor_ids=[],
            warnings=warnings,
        )
    terrain = json.loads(path.read_text(encoding="utf-8"))
    try:
        origin_lat, origin_lon = float(terrain["origin"]["lat"]), float(terrain["origin"]["lon"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Invalid local terrain origin") from exc
    if not np.all(np.isfinite([origin_lat, origin_lon])):
        raise ValueError("Invalid local terrain origin")
    if abs(origin_lat - s.vent_lat) > 1e-8 or abs(origin_lon - s.vent_lon) > 1e-8:
        return LavaResult(
            enabled=False,
            path=[],
            stop_reason="terrain_origin_differs_from_vent",
            footprint=empty,
            affected_receptor_ids=[],
            warnings=warnings,
        )
    try:
        elevation = np.asarray(terrain["elevation_m"], dtype=float)
        mask = np.asarray(terrain["land_mask"], dtype=float)
        east = np.asarray(terrain["east_m"], dtype=float)
        north = np.asarray(terrain["north_m"], dtype=float)
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Invalid local terrain arrays") from exc
    valid_axes = all(
        axis.ndim == 1
        and 2 <= axis.size <= 401
        and np.all(np.isfinite(axis))
        and np.all(np.diff(axis) > 0)
        and np.allclose(np.diff(axis), np.diff(axis)[0], rtol=0, atol=1e-4)
        for axis in (east, north)
    )
    if (
        not valid_axes
        or elevation.shape != (north.size, east.size)
        or mask.shape != elevation.shape
        or not np.all(np.isfinite(elevation))
        or not np.all(np.isin(mask, [0, 1, 2]))
        or elevation.size > 401**2
    ):
        raise ValueError(
            "Invalid or oversized local terrain; finite uniform axes and valid mask required"
        )
    start = int(np.argmin(np.abs(north)) * east.size + np.argmin(np.abs(east)))
    e, n, z, arrived, depth, speed, stop = channel_routing(
        elevation,
        mask,
        east,
        north,
        start,
        options,
        s.duration_s,
    )
    forward, inverse = kernel.projection(s.vent_lat, s.vent_lon)
    lon, lat = inverse.transform(e, n)
    footprint = empty
    affected = []
    if e.size > 1:
        channel = shapely.buffer(
            shapely.LineString(np.stack((e, n), axis=-1)),
            options.lava_width_m / 2,
            cap_style="flat",
            join_style="mitre",
        )
        geographic = shapely.transform(channel, inverse.transform, interleaved=False)
        footprint = GeoJSON(
            features=[
                {
                    "type": "Feature",
                    "properties": {
                        "width_m": options.lava_width_m,
                        "quantity": "illustrative_channel_footprint",
                    },
                    "geometry": json.loads(shapely.to_geojson(geographic)),
                }
            ]
        )
        r_e, r_n = forward.transform(
            np.asarray([r.lon for r in receptors]), np.asarray([r.lat for r in receptors])
        )
        intersect = shapely.intersects_xy(channel, r_e, r_n)
        affected = [r.id for r, hit in zip(receptors, intersect, strict=True) if hit]
    points = [
        LavaPoint(
            east_m=float(e[i]),
            north_m=float(n[i]),
            elevation_m=float(z[i]),
            lon=float(lon[i]),
            lat=float(lat[i]),
            arrival_s=float(arrived[i]),
            width_m=options.lava_width_m,
            thickness_m=float(depth[i]),
            speed_m_s=float(speed[i]),
        )
        for i in range(e.size)
    ]
    return LavaResult(
        enabled=True,
        path=points,
        stop_reason=stop,
        footprint=footprint,
        affected_receptor_ids=affected,
        warnings=warnings,
    )


def lava_snapshot(lava, elapsed, inverse, receptors, east, north):
    """Actual prescribed-width channel reached by this clock; no hazard extrapolation."""
    if not lava.enabled or len(lava.path) < 2 or elapsed <= 0:
        return GeoJSON(features=[]), []
    points = np.asarray([[p.east_m, p.north_m] for p in lava.path])
    arrivals = np.asarray([p.arrival_s for p in lava.path])
    reached = int(np.searchsorted(arrivals, elapsed, side="right"))
    current = points[:reached]
    if 0 < reached < len(points):
        fraction = (elapsed - arrivals[reached - 1]) / (arrivals[reached] - arrivals[reached - 1])
        front = points[reached - 1] + fraction * (points[reached] - points[reached - 1])
        current = np.vstack((current, front))
    if len(current) < 2 or np.all(current == current[0]):
        return GeoJSON(features=[]), []
    channel = shapely.LineString(current).buffer(
        lava.path[0].width_m / 2, cap_style="flat", join_style="mitre"
    )
    geographic = shapely.transform(channel, inverse.transform, interleaved=False)
    footprint = GeoJSON(
        features=[
            {
                "type": "Feature",
                "properties": {
                    "quantity": "illustrative_channel_footprint",
                    "elapsed_s": elapsed,
                    "width_m": lava.path[0].width_m,
                },
                "geometry": json.loads(shapely.to_geojson(geographic)),
            }
        ]
    )
    intersect = shapely.intersects_xy(channel, east, north)
    return footprint, [r.id for r, hit in zip(receptors, intersect, strict=True) if hit]


def sequence(request: EruptionRequest):
    started = perf_counter()
    simulation, options = request.simulation, request.options
    s = simulation.scenario
    (
        data,
        receptors,
        _,
        base_budget,
        settling,
        falling,
        weights,
        variance,
        east,
        north,
        inside,
        inverse,
    ) = service.prepare(simulation)
    count = round(s.domain_km / s.cell_km)
    frame_count = options.frame_count
    estimate = (
        base_budget
        + int(
            8
            * (
                3 * frame_count * count**2
                + 2 * frame_count * falling.size * count
                + 16 * frame_count * falling.size * 6
            )
        )
        + 100 * 1024**2
    )
    if estimate > kernel.MEMORY_LIMIT_BYTES:
        raise ValueError("Eruption sequence exceeds the 512 MiB working-memory budget")
    if s.duration_s + float(np.max(falling)) == float(np.max(falling)):
        raise ValueError("Duration is below floating-point resolution of its settling time")
    times = snapshot_times(
        s.duration_s,
        float(np.max(falling)),
        s.column_height_m / options.plume_rise_speed_m_s,
        frame_count,
    )
    if times.size != frame_count or np.any(np.diff(times) <= 0):
        raise ValueError(
            "Requested timeline cannot be represented at floating-point resolution; "
            "height, duration and settling times are too far apart"
        )
    u_e, u_n = kernel.wind_components(s.wind_speed_m_s, s.wind_from_deg)
    centers, grids, arrived = sequence_grids(
        times, falling, weights, variance, s.duration_s, s.domain_km * 1000, count, u_e, u_n
    )
    coarse_count = min(count, 50)
    coarse_centers, coarse_grids, _ = sequence_grids(
        times, falling, weights, variance, s.duration_s, s.domain_km * 1000, coarse_count, u_e, u_n
    )
    # Per-component receptor Gaussian factors, then native frame × component reduction.
    dx, dy = east[None, :] - u_e * falling[:, None], north[None, :] - u_n * falling[:, None]
    receptor_basis = np.exp(-(dx**2 + dy**2) / (2 * variance[:, None])) / (
        2 * np.pi * variance[:, None]
    )
    receptor_loads = arrived @ receptor_basis
    parcel_arrays = airborne_parcels(
        times,
        s.column_height_m,
        settling,
        s.release_layers,
        np.asarray([g.fraction for g in s.grains]),
        s.mass_rate_kg_s,
        s.duration_s,
        u_e,
        u_n,
        s.diffusivity_m2_s,
        s.initial_spread_m,
    )
    eventual = service.simulate(simulation)
    criterion_by_id = {
        c.id: c for c in (simulation.criteria if simulation.criteria is not None else data.criteria)
    }
    source_ids = {source.id for source in data.sources}
    reviewed = {
        c.id: c
        for c in data.criteria
        if c.review_status == "reviewed" and c.source_ids and set(c.source_ids) <= source_ids
    }
    usable = [c for c in criterion_by_id.values() if c.id in reviewed and c == reviewed[c.id]]
    thresholds = np.asarray([c.threshold for c in usable])
    quantities = np.asarray([c.quantity == "load_kg_m2" for c in usable])
    receptor_thicknesses = receptor_loads * 1000 / s.bulk_density_kg_m3
    criterion_values = np.where(
        quantities[None, :, None], receptor_loads[:, None, :], receptor_thicknesses[:, None, :]
    )
    criterion_flags = criterion_values >= thresholds[None, :, None]
    criterion_index = {c.id: i for i, c in enumerate(usable)}
    fountain, flight_time = fountain_geometry(s.volcano_id == "taal" and s.mass_rate_kg_s > 0)
    lava = lava_result(request, receptors)
    forward, _ = kernel.projection(s.vent_lat, s.vent_lon)
    receptor_e, receptor_n = forward.transform(
        np.asarray([r.lon for r in receptors]), np.asarray([r.lat for r in receptors])
    )
    frames = []
    for frame_index, elapsed in enumerate(times):
        cumulative_mass = float(np.sum(arrived[frame_index]))
        emitted = s.mass_rate_kg_s * min(float(elapsed), s.duration_s)
        inside_mass = float(np.sum(grids[frame_index]) * (s.cell_km * 1000) ** 2)
        loads = receptor_loads[frame_index]
        thickness = loads * 1000 / s.bulk_density_kg_m3
        rows = []
        for i, final in enumerate(eventual.receptors):
            screening = {key: "unknown" for key in final.screening}
            # Serialize vectorized comparisons without copying final-stage flags.
            for key, value in final.screening.items():
                if not inside[i] or value == "unknown":
                    continue
                if key == "surface_exposure":
                    screening[key] = "exceeded" if thickness[i] >= 0.5 else "below"
                elif key in criterion_by_id:
                    flag = criterion_flags[frame_index, criterion_index[key], i]
                    screening[key] = "exceeded" if flag else "below"
            rows.append(
                ReceptorResult(
                    **final.model_dump(
                        exclude={"load_kg_m2", "thickness_mm", "reported", "screening"}
                    ),
                    load_kg_m2=float(loads[i]) if inside[i] else None,
                    thickness_mm=float(thickness[i]) if inside[i] else None,
                    reported=bool(thickness[i] >= 0.5) if inside[i] else None,
                    screening=screening,
                )
            )
        p_e, p_n, p_z, p_radius, p_mass, p_grain = (
            a[frame_index].reshape(-1) for a in parcel_arrays
        )
        active = np.flatnonzero(p_mass > 0)
        parcels = [
            PlumeParcel(
                parcel_id=f"component-{i // 6}-cohort-{i % 6}",
                grain_index=int(p_grain[i]),
                east_m=float(p_e[i]),
                north_m=float(p_n[i]),
                height_m=float(p_z[i]),
                radius_m=float(p_radius[i]),
                mass_kg=float(p_mass[i]),
            )
            for i in active
        ]
        phase = (
            "before"
            if elapsed == 0
            else "after"
            if frame_index == len(times) - 1
            else "erupting"
            if elapsed < s.duration_s
            else "settling"
        )
        column = min(s.column_height_m, options.plume_rise_speed_m_s * elapsed) * max(
            0,
            1 - max(0, elapsed - s.duration_s) / (s.column_height_m / options.plume_rise_speed_m_s),
        )
        fountain_particles = []
        if fountain.size and phase == "erupting":
            progress = np.remainder(elapsed / flight_time + np.arange(12) / 12, 1)
            slots = np.minimum((progress * 32).astype(int), 31)
            fountain_particles = fountain[np.arange(12) % 4, slots].tolist()
        lava_footprint, lava_ids = lava_snapshot(
            lava, float(elapsed), inverse, receptors, receptor_e, receptor_n
        )
        frames.append(
            EruptionFrame(
                elapsed_s=float(elapsed),
                phase=phase,
                column_top_m=float(column) if s.mass_rate_kg_s else 0,
                grid=Grid(
                    east_m=coarse_centers.tolist(),
                    north_m=coarse_centers.tolist(),
                    cell_m=s.domain_km * 1000 / coarse_count,
                    extent_m=eventual.grid.extent_m,
                    load_kg_m2=coarse_grids[frame_index].tolist(),
                    thickness_mm=(coarse_grids[frame_index] * 1000 / s.bulk_density_kg_m3).tolist(),
                ),
                contours=service.contour_features(
                    centers, grids[frame_index] * 1000 / s.bulk_density_kg_m3, inverse
                ),
                receptors=rows,
                plume_parcels=parcels,
                fountain_particles_m=fountain_particles,
                lava_footprint=lava_footprint,
                lava_affected_receptor_ids=lava_ids,
                diagnostics=FrameDiagnostics(
                    emitted_mass_kg=emitted,
                    deposited_mass_kg=cumulative_mass,
                    airborne_mass_kg=max(0, emitted - cumulative_mass),
                    inside_domain_mass_kg=inside_mass,
                    outside_domain_mass_kg=max(0, cumulative_mass - inside_mass),
                ),
            )
        )
    return EruptionSequence(
        scenario=s,
        options=options,
        frames=frames,
        final_grid=eventual.grid,
        lava=lava,
        fountain_paths_m=fountain.tolist(),
        fountain_flight_time_s=flight_time,
        fountain_label="Prescribed Taal fountain; not a 2020 reenactment or ballistic hazard model",
        provenance=eventual.provenance,
        warnings=[
            "Academic illustration, not a PHIVOLCS advisory",
            "Ash deposition inserts each source component instantly at its release height",
            "Visible plume rise and fountain are prescribed geometry, not CFD or gas chemistry",
            "Ash ground deposition uses flat vent datum; displayed terrain does not intercept ash",
            "Lava is an optional illustrative single channel, not a lava hazard forecast",
        ],
        assumptions=[
            "Finite constant ash emission over the submitted duration",
            "Each settled component retains its final fall-time Gaussian kernel",
            "Parcel ellipsoids are quantile envelopes, not concentration isosurfaces or tracers",
            f"Conservative working-memory estimate {estimate} bytes; "
            f"elapsed {(perf_counter() - started) * 1000:.1f} ms",
        ],
    )
