"""Local catalog loading and result serialization; science lives in kernel.py."""

import json
from pathlib import Path
from time import perf_counter

import contourpy
import numpy as np
import shapely

from abo_api import evidence, kernel
from abo_api.contracts import (
    Catalog,
    Diagnostics,
    GeoJSON,
    Grid,
    Illustration,
    ObservationResult,
    Provenance,
    ReceptorResult,
    ReplicationResult,
    SimulationRequest,
    SimulationResult,
    Summary,
    SweepReceptor,
    SweepResult,
    Trajectory,
)

DATA_FILE = Path(__file__).resolve().parents[3] / "data" / "catalog.json"


class CatalogUnavailableError(RuntimeError):
    pass


def catalog():
    try:
        return Catalog.model_validate_json(DATA_FILE.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as exc:
        raise CatalogUnavailableError(
            "Local scientific catalog is missing or invalid. Check data/catalog.json."
        ) from exc


def prepare(request, sweep=False):
    data = catalog()
    receptors = request.receptors if request.receptors is not None else data.receptors
    if request.receptors is None:
        year = str(request.population_year)
        receptors = [
            r.model_copy(
                update={
                    "population": r.population_records.get(year)
                    if r.population_records
                    else r.population
                    if r.population_year == request.population_year
                    else None,
                    "population_year": request.population_year
                    if r.kind == "municipality"
                    else None,
                }
            )
            for r in receptors
        ]
    criteria = request.criteria if request.criteria is not None else data.criteria
    if len({r.id for r in receptors}) != len(receptors):
        raise ValueError("Receptor identifiers must be unique; population cannot be double-counted")
    if len({c.id for c in criteria}) != len(criteria):
        raise ValueError("Criterion identifiers must be unique")
    s = request.scenario
    n = int(round(s.domain_km / s.cell_km))
    budget = kernel.check_budget(
        len(s.grains) * s.release_layers, n, len(receptors), 360 if sweep else 1
    )
    fractions = np.asarray([g.fraction for g in s.grains])
    settling = np.asarray([g.settling_speed_m_s for g in s.grains])
    times, weights, variance = kernel.components(
        s.column_height_m,
        s.mass_rate_kg_s * s.duration_s,
        fractions,
        settling,
        s.release_layers,
        s.diffusivity_m2_s,
        s.initial_spread_m,
    )
    forward, inverse = kernel.projection(s.vent_lat, s.vent_lon)
    east, north = forward.transform(
        np.asarray([r.lon for r in receptors]), np.asarray([r.lat for r in receptors])
    )
    east, north = np.asarray(east), np.asarray(north)
    if not (np.all(np.isfinite(east)) and np.all(np.isfinite(north))):
        raise ValueError("Receptor coordinates cannot be represented in the local projection")
    half = s.domain_km * 500
    # A micrometre tolerance covers projection round-off at the inclusive edge.
    inside = (np.abs(east) <= half + 1e-6) & (np.abs(north) <= half + 1e-6)
    return (
        data,
        receptors,
        criteria,
        budget,
        settling,
        times,
        weights,
        variance,
        east,
        north,
        inside,
        inverse,
    )


def provenance(scenario, data, receptors=(), criteria=()):
    source_ids = sorted(
        set(scenario.source_ids)
        | {source for r in receptors for source in r.source_ids}
        | {source for c in criteria for source in c.source_ids}
    )
    return Provenance(
        dataset_revision=data.revision,
        source_ids=source_ids,
        input_status=scenario.input_status,
        assumptions=[
            "Steady eruption and uniform wind",
            "Flat ground at vent datum",
            "Constant class settling speeds",
            "Uniform release-height weights",
            "Centroids are point samples; population counts are indicative",
        ],
        warnings=[
            "Academic simulation, not a PHIVOLCS advisory",
            "Surface exposure does not establish roof safety, water potability or flight safety",
            "No historical predictive validation has been established",
            "Input status is caller metadata; it does not certify scientific review",
            "Finite release-height quadrature may require local receptor sensitivity checks",
        ]
        + (
            ["Physical inputs are illustrative assumptions, not measured eruption values"]
            if scenario.input_status == "illustrative"
            else []
        ),
    )


def criterion_applicability(criterion, receptor, context):
    """Source-reviewed thresholds require a stated type and matching conditions."""
    if not criterion.receptor_kinds or not criterion.applicability_basis:
        return False, "Criterion has no reviewed receptor type/applicability basis"
    if receptor.kind not in criterion.receptor_kinds:
        return False, "Receptor type does not match this criterion"
    if not criterion.required_conditions:
        return False, "Criterion has no reviewed condition-specific applicability"
    conditions = {**context, **receptor.screening_conditions}
    for key, expected in criterion.required_conditions.items():
        if key not in conditions:
            return False, f"Required screening condition unavailable: {key}"
        if conditions[key] != expected:
            return False, f"Screening condition does not match: {key}"
    return True, "Reviewed receptor type and screening conditions match"


def contour_features(centers, thickness, inverse):
    contour = contourpy.contour_generator(x=centers, y=centers, z=thickness)
    features = []
    for level in (0.5, 1, 5, 10, 50, 100):
        for line in contour.lines(level):
            if line.shape[0] < 2:
                continue
            lon, lat = inverse.transform(line[:, 0], line[:, 1])
            features.append(
                {
                    "type": "Feature",
                    "properties": {"thickness_mm": level},
                    "geometry": {
                        "type": "LineString",
                        "coordinates": np.stack((lon, lat), axis=-1).tolist(),
                    },
                }
            )
    return GeoJSON(features=features)


def simulate(request: SimulationRequest):
    started = perf_counter()
    (
        data,
        receptors,
        criteria,
        budget,
        settling,
        times,
        weights,
        variance,
        east,
        north,
        inside,
        inverse,
    ) = prepare(request)
    s = request.scenario
    u_e, u_n = kernel.wind_components(s.wind_speed_m_s, s.wind_from_deg)
    centers, grid, retained = kernel.grid_load(
        s.domain_km * 1000, s.cell_km * 1000, times, weights, variance, u_e, u_n
    )
    load = kernel.point_load(east, north, times, weights, variance, u_e, u_n)[0]
    known_sources = {source.id for source in data.sources}
    reviewed_catalog = {
        c.id: c
        for c in data.criteria
        if c.review_status == "reviewed" and c.source_ids and set(c.source_ids) <= known_sources
    }
    reviewed = [c for c in criteria if c.id in reviewed_catalog and c == reviewed_catalog[c.id]]
    eligibility = [
        [criterion_applicability(c, r, request.screening_context) for r in receptors]
        for c in reviewed
    ]
    applicability = np.asarray(
        [[item[0] for item in row] for row in eligibility], dtype=bool
    ).reshape(len(reviewed), len(receptors))
    result = kernel.exposure(
        load,
        s.bulk_density_kg_m3,
        inside,
        np.asarray([r.kind == "municipality" for r in receptors], dtype=bool),
        np.asarray([r.population if r.population is not None else -1 for r in receptors]),
        np.asarray([c.threshold for c in reviewed]),
        np.asarray([0 if c.quantity == "load_kg_m2" else 1 for c in reviewed]),
        applicability,
    )
    rows = []
    for i, receptor in enumerate(receptors):
        screening = {"roof": "unknown", "crop": "unknown"}
        screening_reasons = {
            "roof": "No reviewed applicable roof criterion",
            "crop": "No reviewed applicable crop criterion",
        }
        screening.update({c.id: "unknown" for c in criteria})
        screening_reasons.update(
            {c.id: "Criterion is not an identical reviewed local record" for c in criteria}
        )
        screening.update(
            {
                c.id: ("exceeded" if result["exceeded"][j, i] else "below")
                if inside[i] and applicability[j, i]
                else "unknown"
                for j, c in enumerate(reviewed)
            }
        )
        screening_reasons.update(
            {
                c.id: eligibility[j][i][1]
                if inside[i]
                else "Receptor is outside the modeled domain"
                for j, c in enumerate(reviewed)
            }
        )
        if receptor.kind in ("airport", "water"):
            screening["surface_exposure"] = (
                ("exceeded" if result["reported"][i] else "below") if inside[i] else "unknown"
            )
            screening_reasons["surface_exposure"] = (
                "0.5 mm surface-deposition reporting cutoff; no water or aviation safety inference"
                if inside[i]
                else "Receptor is outside the modeled domain"
            )
        rows.append(
            ReceptorResult(
                **receptor.model_dump(),
                east_m=float(east[i]),
                north_m=float(north[i]),
                in_domain=bool(inside[i]),
                load_kg_m2=float(load[i]) if inside[i] else None,
                thickness_mm=float(result["thickness"][i]) if inside[i] else None,
                reported=bool(result["reported"][i]) if inside[i] else None,
                screening=screening,
                screening_reasons=screening_reasons,
            )
        )
    falling, paths = kernel.trajectories(s.column_height_m, settling, u_e, u_n)
    total = s.mass_rate_kg_s * s.duration_s
    grid_mm = grid * 1000 / s.bulk_density_kg_m3
    return SimulationResult(
        scenario=s,
        grid=Grid(
            east_m=centers.tolist(),
            north_m=centers.tolist(),
            cell_m=s.cell_km * 1000,
            extent_m=[-s.domain_km * 500, -s.domain_km * 500, s.domain_km * 500, s.domain_km * 500],
            thickness_mm=grid_mm.tolist(),
            load_kg_m2=grid.tolist(),
        ),
        contours=contour_features(centers, grid_mm, inverse),
        receptors=rows,
        summary=Summary(
            receptors_total=len(receptors),
            receptors_covered=int(np.count_nonzero(inside)),
            municipalities_reported=result["municipalities_reported"],
            indicative_population=result["indicative_population"],
            reported_population_unknown=result["reported_population_unknown"],
            criterion_counts={
                c.id: int(result["criterion_counts"][i]) for i, c in enumerate(reviewed)
            },
            criterion_population={
                c.id: int(result["criterion_population"][i]) for i, c in enumerate(reviewed)
            },
        ),
        diagnostics=Diagnostics(
            total_ash_mass_kg=total,
            inside_domain_mass_kg=retained,
            outside_domain_mass_kg=max(0, total - retained),
            retained_fraction=retained / total if total else 0,
            estimated_working_bytes=budget,
            elapsed_ms=(perf_counter() - started) * 1000,
        ),
        illustration=Illustration(
            wind_east_m_s=float(u_e),
            wind_north_m_s=float(u_n),
            column_height_m=s.column_height_m,
            paths=[
                Trajectory(
                    grain_index=i,
                    diameter_um=g.diameter_um,
                    settling_time_s=float(falling[i]),
                    points_m=paths[i].tolist(),
                )
                for i, g in enumerate(s.grains)
            ],
        ),
        provenance=provenance(s, data, receptors, reviewed),
    )


def sweep(request: SimulationRequest):
    started = perf_counter()
    (data, receptors, _, _, _, times, weights, variance, east, north, inside, _) = prepare(
        request, sweep=True
    )
    loads, bearings = kernel.sweep_maxima(
        east, north, times, weights, variance, request.scenario.wind_speed_m_s
    )
    return SweepResult(
        scenario=request.scenario,
        receptors=[
            SweepReceptor(
                **r.model_dump(),
                in_domain=bool(inside[i]),
                maximum_load_kg_m2=float(loads[i]) if inside[i] else None,
                maximum_thickness_mm=float(loads[i] * 1000 / request.scenario.bulk_density_kg_m3)
                if inside[i]
                else None,
                wind_from_deg=float(bearings[i]) if inside[i] else None,
            )
            for i, r in enumerate(receptors)
        ],
        elapsed_ms=(perf_counter() - started) * 1000,
        provenance=provenance(request.scenario, data, receptors),
    )


def replication():
    data = catalog()
    record = data.historical
    identity = dict(
        protocol=record.protocol,
        dataset_id=record.dataset_id,
        source_dependencies=record.source_dependencies,
        assessment_reasons=record.assessment_reasons,
        reference_tables=record.reference_tables,
        reference_footprint_geojson=record.reference_footprint_geojson,
        reference_footprints=record.reference_footprints,
        footprint_evidence=record.footprint_evidence,
    )
    evidence.check_split_independence(record.observations)
    if record.protocol is not None and record.protocol.review_status != "approved":
        return ReplicationResult(
            available=False,
            reason="Frozen historical methodology has not passed independent review",
            observations=record.observations,
            blocked_inputs=record.blocked_inputs,
            **identity,
        )
    if not record.available or record.scenario is None:
        return ReplicationResult(
            available=False,
            reason=record.reason,
            observations=record.observations,
            blocked_inputs=record.blocked_inputs,
            **identity,
        )
    evaluation = [o for o in record.observations if o.split == "evaluation"]
    if (
        not evaluation
        and record.reference_footprint_geojson is None
        and not record.reference_footprints
    ):
        return ReplicationResult(
            available=False,
            reason="No independent held-out observations",
            observations=record.observations,
            **identity,
        )
    result = simulate(SimulationRequest(scenario=record.scenario, population_year=2020))
    forward, _ = kernel.projection(record.scenario.vent_lat, record.scenario.vent_lon)
    east, north = forward.transform(
        np.asarray([o.lon for o in evaluation]), np.asarray([o.lat for o in evaluation])
    )
    s = record.scenario
    times, weights, variance = kernel.components(
        s.column_height_m,
        s.mass_rate_kg_s * s.duration_s,
        np.asarray([g.fraction for g in s.grains]),
        np.asarray([g.settling_speed_m_s for g in s.grains]),
        s.release_layers,
        s.diffusivity_m2_s,
        s.initial_spread_m,
    )
    u_e, u_n = kernel.wind_components(s.wind_speed_m_s, s.wind_from_deg)
    predicted = (
        kernel.point_load(np.asarray(east), np.asarray(north), times, weights, variance, u_e, u_n)[
            0
        ]
        * 1000
        / s.bulk_density_kg_m3
    )
    half = s.domain_km * 500
    covered = (np.abs(east) <= half + 1e-6) & (np.abs(north) <= half + 1e-6)
    metrics = {
        key: None
        for key in (
            "rmse_mm",
            "interval_rmse_mm",
            "interval_mae_mm",
            "midpoint_rmse_mm",
            "midpoint_mae_mm",
            "median_factor_error",
            "range_coverage_fraction",
        )
    }
    if np.any(covered):
        metrics.update(
            kernel.observation_metrics(
                predicted[covered],
                np.asarray([o.lower_mm for o in evaluation])[covered],
                np.asarray([o.upper_mm for o in evaluation])[covered],
            )
        )
    metrics["evaluation_observations_covered"] = int(np.count_nonzero(covered))
    metrics["evaluation_observations_outside_domain"] = int(np.count_nonzero(~covered))
    metrics["footprint_iou"] = None
    observation_rows = []
    for i, observation in enumerate(evaluation):
        p = float(predicted[i]) if covered[i] else None
        residual = (
            p - observation.lower_mm
            if p is not None and p < observation.lower_mm
            else p - observation.upper_mm
            if p is not None and p > observation.upper_mm
            else 0.0
            if p is not None
            else None
        )
        observation_rows.append(
            ObservationResult(
                observation_id=observation.id or f"evaluation-{i + 1}",
                spatial_group=observation.spatial_group,
                dependency_group=observation.dependency_group,
                split=observation.split,
                lat=observation.lat,
                lon=observation.lon,
                lower_mm=observation.lower_mm,
                upper_mm=observation.upper_mm,
                in_domain=bool(covered[i]),
                predicted_mm=p,
                interval_residual_mm=residual,
                midpoint_residual_mm=p - (observation.lower_mm + observation.upper_mm) / 2
                if p is not None
                else None,
                reason="Held-out analytical point prediction; descriptive agreement"
                if covered[i]
                else "Outside the fixed model domain; excluded from error metrics",
            )
        )
    if record.reference_footprint_geojson is not None:
        geometry_json = record.reference_footprint_geojson
        if geometry_json.get("type") == "Feature":
            geometry_json = geometry_json["geometry"]
        geometry = shapely.from_geojson(json.dumps(geometry_json))
        if geometry.geom_type not in ("Polygon", "MultiPolygon") or not geometry.is_valid:
            raise ValueError("Historical reporting footprint must be a valid Polygon/MultiPolygon")
        _, inverse = kernel.projection(s.vent_lat, s.vent_lon)
        metrics["footprint_iou"] = kernel.footprint_iou(
            np.asarray(result.grid.east_m),
            np.asarray(result.grid.north_m),
            np.asarray(result.grid.thickness_mm),
            inverse,
            geometry,
        )
    for index, reference in enumerate(record.reference_footprints):
        if reference.threshold_mm != 0.5:
            raise ValueError("Historical reference footprint must use the frozen 0.5 mm cutoff")
        geometry_json = reference.geojson
        if geometry_json.get("type") == "Feature":
            geometry_json = geometry_json["geometry"]
        geometry = shapely.from_geojson(json.dumps(geometry_json))
        if geometry.geom_type not in ("Polygon", "MultiPolygon") or not geometry.is_valid:
            raise ValueError("Historical reporting footprint must be a valid Polygon/MultiPolygon")
        _, inverse = kernel.projection(s.vent_lat, s.vent_lon)
        metrics[f"footprint_iou_trace_{index + 1}"] = kernel.footprint_iou(
            np.asarray(result.grid.east_m),
            np.asarray(result.grid.north_m),
            np.asarray(result.grid.thickness_mm),
            inverse,
            geometry,
        )
    return ReplicationResult(
        available=True,
        reason="Held-out points and grid-center footprint IoU in model domain; no certification",
        simulation=result,
        metrics=metrics,
        observations=record.observations,
        validation_status="evaluated_not_validated",
        observation_results=observation_rows,
        **identity,
    )
