"""Independent invariants and closed-form synthetic examples, not real eruption data."""

import ast
import json
import math
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from abo_api import eruption, kernel, service
from abo_api.contracts import (
    Catalog,
    EruptionOptions,
    EruptionPulse,
    EruptionRequest,
    Scenario,
    SimulationRequest,
    WindLevel,
)
from abo_api.main import app, compute_slot


@pytest.fixture
def scenario():
    return Scenario(
        vent_lat=14,
        vent_lon=121,
        vent_elevation_m=10,
        column_height_m=1000,
        mass_rate_kg_s=100,
        duration_s=1000,
        wind_speed_m_s=0,
        wind_from_deg=0,
        diffusivity_m2_s=0,
        initial_spread_m=1000,
        bulk_density_kg_m3=1000,
        grains=[
            {"diameter_um": d, "fraction": f, "settling_speed_m_s": 1}
            for d, f in ((50, 0.2), (100, 0.3), (200, 0.5))
        ],
        domain_km=20,
        cell_km=1,
        input_status="illustrative",
    )


@pytest.fixture
def local_catalog(monkeypatch):
    data = Catalog(
        revision="synthetic-fixture",
        sources=[{"id": "test", "title": "Synthetic", "url": "test"}],
        volcanoes=[],
        scenarios=[],
        winds=[],
        receptors=[
            {
                "id": "one",
                "name": "Synthetic point",
                "lat": 14,
                "lon": 121,
                "population": 100,
                "population_year": 2024,
            }
        ],
        criteria=[
            {
                "id": "roof",
                "label": "Test criterion",
                "quantity": "load_kg_m2",
                "threshold": 0.01,
                "scope": "Synthetic only",
                "source_ids": ["test"],
                "review_status": "reviewed",
                "receptor_kinds": ["municipality"],
                "required_conditions": {"fixture": "synthetic"},
                "applicability_basis": "Synthetic numerical fixture only",
            }
        ],
        historical={"available": False, "reason": "Synthetic fixture has no historic data"},
    )
    monkeypatch.setattr(service, "catalog", lambda: data)
    data.receptors[0].screening_conditions = {"fixture": "synthetic"}
    return data


def test_worked_example_exact_cell_mass():
    expected = math.erf(500 / (math.sqrt(2) * 1000)) ** 2 * 100000
    probability = kernel.gaussian_intervals(
        np.asarray([-500, 500]), np.asarray([0]), np.asarray([1000])
    )[0, 0]
    assert probability**2 * 100000 == pytest.approx(expected, rel=1e-13)
    assert expected == pytest.approx(14663.14963084119)


def test_grid_centers_exact_integral_point_units(scenario, local_catalog):
    result = service.simulate(SimulationRequest(scenario=scenario))
    expected_point = 100000 / (2 * math.pi * 1000**2)
    assert result.receptors[0].load_kg_m2 == pytest.approx(expected_point)
    assert result.receptors[0].thickness_mm == pytest.approx(expected_point)
    assert result.grid.east_m[0] == -9500
    assert result.grid.east_m[-1] == 9500
    cell_mass = np.asarray(result.grid.load_kg_m2).sum() * 1e6
    expected = math.erf(10000 / (math.sqrt(2) * 1000)) ** 2 * 100000
    assert cell_mass == pytest.approx(expected, rel=1e-12)
    assert result.diagnostics.inside_domain_mass_kg == pytest.approx(expected)
    assert result.receptors[0].screening["roof"] == "exceeded"
    assert result.receptors[0].screening["crop"] == "unknown"


def test_zero_mass_and_unknown_outside(scenario, local_catalog):
    scenario.mass_rate_kg_s = 0
    local_catalog.receptors.append(
        local_catalog.receptors[0].model_copy(update={"id": "outside", "lat": 20})
    )
    result = service.simulate(SimulationRequest(scenario=scenario))
    assert np.count_nonzero(result.grid.load_kg_m2) == 0
    assert result.diagnostics.total_ash_mass_kg == 0
    assert result.receptors[1].load_kg_m2 is None
    assert result.receptors[1].screening["roof"] == "unknown"


@pytest.mark.parametrize(
    "bearing,expected", [(0, (0, -10)), (90, (-10, 0)), (180, (0, 10)), (270, (10, 0))]
)
def test_wind_from_cardinal(bearing, expected):
    assert kernel.wind_components(10, bearing) == pytest.approx(expected, abs=1e-12)


def test_projection_roundtrip_and_positive_east():
    forward, inverse = kernel.projection(14, 121)
    east, north = forward.transform(121.01, 14)
    assert east > 1000 and abs(north) < 1
    assert inverse.transform(east, north) == pytest.approx((121.01, 14))


def test_finite_domain_loss_and_resolution(scenario, local_catalog):
    scenario.wind_speed_m_s = 10
    scenario.wind_from_deg = 270
    scenario.column_height_m = 5000
    coarse = service.simulate(SimulationRequest(scenario=scenario))
    scenario.cell_km = 0.5
    fine = service.simulate(SimulationRequest(scenario=scenario))
    assert 0 < coarse.diagnostics.retained_fraction < 1
    assert coarse.diagnostics.inside_domain_mass_kg == pytest.approx(
        fine.diagnostics.inside_domain_mass_kg, rel=1e-12
    )
    assert (
        coarse.diagnostics.inside_domain_mass_kg + coarse.diagnostics.outside_domain_mass_kg
        == pytest.approx(coarse.diagnostics.total_ash_mass_kg)
    )


def test_sweep_cardinal_and_calm_tie(scenario, local_catalog):
    scenario.wind_speed_m_s = 10
    local_catalog.receptors[0].lon = 121.03
    result = service.sweep(SimulationRequest(scenario=scenario))
    assert result.receptors[0].wind_from_deg == 270
    scenario.wind_speed_m_s = 0
    assert service.sweep(SimulationRequest(scenario=scenario)).receptors[0].wind_from_deg == 0


def test_threshold_equality_unique_population_and_unreviewed(scenario, local_catalog):
    point = 100000 / (2 * math.pi * 1000**2)
    local_catalog.criteria[0].threshold = point
    result = service.simulate(SimulationRequest(scenario=scenario))
    assert result.receptors[0].screening["roof"] == "exceeded"
    assert result.summary.criterion_population["roof"] == 100
    requested = local_catalog.criteria[0].model_copy(update={"threshold": 0})
    result = service.simulate(SimulationRequest(scenario=scenario, criteria=[requested]))
    assert result.receptors[0].screening["roof"] == "unknown"
    duplicate = local_catalog.receptors[0].model_copy()
    with pytest.raises(ValueError, match="unique"):
        service.simulate(SimulationRequest(scenario=scenario, receptors=[duplicate, duplicate]))


def test_population_reporting_union_and_missing(scenario, local_catalog):
    scenario.mass_rate_kg_s = 10000
    local_catalog.receptors.append(
        local_catalog.receptors[0].model_copy(
            update={"id": "missing", "population": None, "population_year": None}
        )
    )
    result = service.simulate(SimulationRequest(scenario=scenario))
    assert result.summary.municipalities_reported == 2
    assert result.summary.indicative_population == 100
    assert result.summary.reported_population_unknown == 1


def test_resource_budget_guard():
    with pytest.raises(ValueError, match="512 MiB"):
        kernel.check_budget(160, 400, 2048, 360)


def test_representative_grain_paths_preserve_physical_times_and_wind_units():
    times, points = kernel.trajectories(2000, np.asarray([0.5, 2, 5]), 3, -4)
    assert times == pytest.approx([2000, 500, 200])
    assert points[:, 0, :] == pytest.approx(np.asarray([[0, 0, 1000]] * 3))
    assert points[:, -1, 0] == pytest.approx(3 * times)
    assert points[:, -1, 1] == pytest.approx(-4 * times)
    assert points[:, -1, 2] == pytest.approx(np.zeros(3))
    # At a shared physical t=100 s, coarse grains sit lower than fine grains;
    # normalizing every class to the same playback duration would hide this.
    elapsed = 100
    progress = elapsed / times
    height = 1000 * (1 - progress)
    assert height == pytest.approx([950, 800, 500])
    assert np.all(np.diff(times) < 0)


def test_increasing_diffusion_spreads_load_without_changing_infinite_mass():
    fractions = np.asarray([0.2, 0.3, 0.5])
    settling = np.asarray([0.5, 2, 5])
    times, weights, variance = kernel.components(2000, 100000, fractions, settling, 16, 0, 100)
    _, _, wider = kernel.components(2000, 100000, fractions, settling, 16, 1000, 100)
    assert np.sum(weights) == pytest.approx(100000)
    assert wider == pytest.approx(variance + 2000 * times)
    calm_center = kernel.point_load(
        np.asarray([0]), np.asarray([0]), times, weights, variance, 0, 0
    )[0, 0]
    spread_center = kernel.point_load(
        np.asarray([0]), np.asarray([0]), times, weights, wider, 0, 0
    )[0, 0]
    assert 0 < spread_center < calm_center


def test_api_routes_invalid_values_and_busy(scenario, local_catalog):
    client = TestClient(app)
    payload = {"scenario": scenario.model_dump()}
    response = client.post("/api/simulations", json=payload)
    assert response.status_code == 200
    assert client.get("/api/catalog").json()["revision"] == "synthetic-fixture"
    historic = client.post("/api/replications/taal-2020").json()
    assert historic["available"] is False and historic["simulation"] is None
    for field, value in (
        ("initial_spread_m", 1e-200),
        ("bulk_density_kg_m3", 1e-320),
        ("domain_km", 1),
        ("wind_from_deg", 360),
    ):
        invalid = scenario.model_dump()
        invalid[field] = value
        assert client.post("/api/simulations", json={"scenario": invalid}).status_code == 422
    compute_slot.acquire()
    try:
        assert client.post("/api/simulations", json=payload).status_code == 429
    finally:
        compute_slot.release()


def test_computational_module_has_no_python_loops():
    tree = ast.parse(Path(kernel.__file__).read_text(encoding="utf-8"))
    forbidden = (ast.For, ast.While, ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)
    assert not any(isinstance(node, forbidden) for node in ast.walk(tree))
    assert "np.vectorize" not in Path(kernel.__file__).read_text(encoding="utf-8")


def test_observation_range_error():
    metrics = kernel.observation_metrics(
        np.asarray([1, 4, 10]), np.asarray([1, 2, 8]), np.asarray([2, 3, 12])
    )
    assert metrics["range_coverage_fraction"] == pytest.approx(2 / 3)
    assert metrics["rmse_mm"] == pytest.approx(math.sqrt(1 / 3))


def test_raw_nonfinite_json_is_a_validation_error(scenario, local_catalog):
    client = TestClient(app, raise_server_exceptions=False)
    for value in (float("nan"), float("inf"), float("-inf")):
        payload = scenario.model_dump()
        payload["wind_speed_m_s"] = value
        response = client.post(
            "/api/simulations",
            content=json.dumps({"scenario": payload}),
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"][-1] == "wind_speed_m_s"


def test_historical_evaluation_and_polygon_grid_iou(scenario, local_catalog):
    from abo_api.contracts import HistoricalRecord

    point = 100000 / (2 * math.pi * 1000**2)
    local_catalog.historical = HistoricalRecord(
        available=True,
        reason="Synthetic historical test only",
        scenario=scenario,
        observations=[
            {
                "lat": 14,
                "lon": 121,
                "lower_mm": point * 0.99,
                "upper_mm": point * 1.01,
                "split": "evaluation",
            }
        ],
        reference_footprint_geojson={
            "type": "Polygon",
            "coordinates": [
                [
                    [120.99, 13.99],
                    [121.01, 13.99],
                    [121.01, 14.01],
                    [120.99, 14.01],
                    [120.99, 13.99],
                ]
            ],
        },
    )
    result = service.replication()
    assert result.available is True
    assert result.metrics["rmse_mm"] == 0
    assert result.metrics["evaluation_observations_covered"] == 1
    assert result.metrics["footprint_iou"] == 0
    assert result.validation_status == "evaluated_not_validated"


def test_historical_observation_interval_must_be_ordered():
    from pydantic import ValidationError

    from abo_api.contracts import Observation

    with pytest.raises(ValidationError, match="upper thickness"):
        Observation(lat=14, lon=121, lower_mm=3, upper_mm=1, split="evaluation")


def test_receptor_population_requires_year():
    from pydantic import ValidationError

    from abo_api.contracts import Receptor

    with pytest.raises(ValidationError, match="explicit census"):
        Receptor(id="synthetic", name="Synthetic", lat=14, lon=121, population=100)


def test_domain_edge_inclusive_with_projection_roundoff(scenario, local_catalog):
    _, inverse = kernel.projection(scenario.vent_lat, scenario.vent_lon)
    lon, lat = inverse.transform(10000, 0)
    edge = local_catalog.receptors[0].model_copy(update={"lon": lon, "lat": lat})
    result = service.simulate(SimulationRequest(scenario=scenario, receptors=[edge]))
    assert result.receptors[0].in_domain is True
    lon, lat = inverse.transform(10000.1, 0)
    outside = edge.model_copy(update={"lon": lon, "lat": lat})
    result = service.simulate(SimulationRequest(scenario=scenario, receptors=[outside]))
    assert result.receptors[0].in_domain is False


def test_missing_local_catalog_is_informative_503(scenario, monkeypatch, tmp_path):
    monkeypatch.setattr(service, "DATA_FILE", tmp_path / "missing-catalog.json")
    client = TestClient(app)
    assert client.get("/api/catalog").status_code == 503
    response = client.post("/api/simulations", json={"scenario": scenario.model_dump()})
    assert response.status_code == 503
    assert "missing or invalid" in response.json()["detail"]


def test_wind_profile_equivalent_to_uniform_wind(scenario, local_catalog):
    base_scenario = scenario.model_copy(update={"wind_speed_m_s": 8.0, "wind_from_deg": 225.0})
    profile_scenario = base_scenario.model_copy(
        update={
            "wind_profile": [
                WindLevel(height_above_vent_m=0.0, speed_m_s=8.0, wind_from_deg=225.0),
                WindLevel(height_above_vent_m=2000.0, speed_m_s=8.0, wind_from_deg=225.0),
            ]
        }
    )
    req_base = SimulationRequest(scenario=base_scenario, receptors=local_catalog.receptors)
    req_profile = SimulationRequest(scenario=profile_scenario, receptors=local_catalog.receptors)
    res_base = service.simulate(req_base)
    res_profile = service.simulate(req_profile)
    assert np.allclose(res_base.grid.load_kg_m2, res_profile.grid.load_kg_m2, rtol=1e-5, atol=1e-8)
    assert math.isclose(
        res_base.receptors[0].load_kg_m2, res_profile.receptors[0].load_kg_m2, abs_tol=1e-6
    )


def test_wind_profile_directional_shear(scenario, local_catalog):
    # Wind shear: at ground blowing from 180° (northward); at 2000m from 270° (eastward).
    sheared_scenario = scenario.model_copy(
        update={
            "column_height_m": 2000.0,
            "wind_profile": [
                WindLevel(height_above_vent_m=0.0, speed_m_s=10.0, wind_from_deg=180.0),
                WindLevel(height_above_vent_m=2000.0, speed_m_s=10.0, wind_from_deg=270.0),
            ],
        }
    )
    res = service.simulate(
        SimulationRequest(scenario=sheared_scenario, receptors=local_catalog.receptors)
    )
    grid = np.asarray(res.grid.load_kg_m2)
    assert np.sum(grid) > 0
    assert "height-dependent wind linearly interpolated" in res.provenance.assumptions[0]


def test_pulses_equivalent_to_single_steady_block(scenario, local_catalog):
    single_pulse_scenario = scenario.model_copy(
        update={
            "pulses": [
                EruptionPulse(
                    start_s=0.0,
                    duration_s=scenario.duration_s,
                    mass_rate_kg_s=scenario.mass_rate_kg_s,
                    column_height_m=scenario.column_height_m,
                )
            ]
        }
    )
    req_base = SimulationRequest(scenario=scenario, receptors=local_catalog.receptors)
    req_pulse = SimulationRequest(scenario=single_pulse_scenario, receptors=local_catalog.receptors)
    res_base = service.simulate(req_base)
    res_pulse = service.simulate(req_pulse)
    assert np.allclose(res_base.grid.load_kg_m2, res_pulse.grid.load_kg_m2, rtol=1e-5, atol=1e-8)
    assert math.isclose(
        res_base.receptors[0].load_kg_m2, res_pulse.receptors[0].load_kg_m2, abs_tol=1e-6
    )


def test_multi_pulse_mass_conservation(scenario, local_catalog):
    # Two pulses: pulse 1 (0s..500s, 120 kg/s), pulse 2 (500s..1000s, 80 kg/s)
    # Total mass = 500*120 + 500*80 = 60,000 + 40,000 = 100,000 kg
    two_pulse_scenario = scenario.model_copy(
        update={
            "duration_s": 1000.0,
            "column_height_m": 1200.0,
            "mass_rate_kg_s": 100.0,
            "pulses": [
                EruptionPulse(
                    start_s=0.0,
                    duration_s=500.0,
                    mass_rate_kg_s=120.0,
                    column_height_m=1000.0,
                ),
                EruptionPulse(
                    start_s=500.0,
                    duration_s=500.0,
                    mass_rate_kg_s=80.0,
                    column_height_m=1200.0,
                ),
            ],
        }
    )
    res = service.simulate(
        SimulationRequest(scenario=two_pulse_scenario, receptors=local_catalog.receptors)
    )
    total_mass = 100000.0
    assert res.diagnostics.total_ash_mass_kg == total_mass
    retained = res.diagnostics.inside_domain_mass_kg
    outside = res.diagnostics.outside_domain_mass_kg
    assert math.isclose(retained + outside, total_mass, rel_tol=1e-4)


def test_eruption_sequence_with_pulses_and_wind_profile(scenario, local_catalog):
    multi_scenario = scenario.model_copy(
        update={
            "duration_s": 1000.0,
            "mass_rate_kg_s": 100.0,
            "pulses": [
                EruptionPulse(
                    start_s=0.0,
                    duration_s=500.0,
                    mass_rate_kg_s=100.0,
                    column_height_m=1000.0,
                ),
                EruptionPulse(
                    start_s=500.0,
                    duration_s=500.0,
                    mass_rate_kg_s=100.0,
                    column_height_m=1000.0,
                ),
            ],
            "wind_profile": [
                WindLevel(height_above_vent_m=0.0, speed_m_s=5.0, wind_from_deg=180.0),
                WindLevel(height_above_vent_m=1000.0, speed_m_s=10.0, wind_from_deg=270.0),
            ],
        }
    )
    seq = eruption.sequence(
        EruptionRequest(
            simulation=SimulationRequest(
                scenario=multi_scenario, receptors=local_catalog.receptors
            ),
            options=EruptionOptions(frame_count=25),
        )
    )
    assert len(seq.frames) == 25
    # Final frame cumulative load should be positive
    last_frame = seq.frames[-1]
    assert np.sum(last_frame.grid.load_kg_m2) > 0
