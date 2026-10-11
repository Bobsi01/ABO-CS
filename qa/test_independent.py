"""Independent API checks with scalar reference arithmetic, not solver imports.

Run from backend: uv run pytest ../qa/test_independent.py -q
All values below are synthetic test fixtures, not Philippine eruption inputs.
"""

import ast
import copy
import json
import math
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from abo_api.main import app


@pytest.fixture
def client(monkeypatch):
    from abo_api import service
    from abo_api.contracts import Catalog

    # Isolate numerical tests from evolving real data. All receptor/scenario
    # quantities are supplied by these independent synthetic fixtures.
    test_catalog = Catalog(
        revision="qa-synthetic-only",
        sources=[],
        volcanoes=[],
        scenarios=[],
        winds=[],
        receptors=[],
        criteria=[],
        historical={"available": False},
    )
    monkeypatch.setattr(service, "catalog", lambda: test_catalog)
    return TestClient(app)


def request():
    return {
        "scenario": {
            "volcano_id": "custom",
            "label": "Independent synthetic Gaussian fixture",
            "input_status": "illustrative",
            "source_ids": [],
            "vent_lat": 14,
            "vent_lon": 121,
            "vent_elevation_m": 0,
            "column_height_m": 1000,
            "mass_rate_kg_s": 1000,
            "duration_s": 100,
            "wind_speed_m_s": 0,
            "wind_from_deg": 0,
            "diffusivity_m2_s": 0,
            "initial_spread_m": 1000,
            "bulk_density_kg_m3": 1000,
            "grains": [
                {"diameter_um": 100, "fraction": 1, "settling_speed_m_s": 1},
                {"diameter_um": 200, "fraction": 0, "settling_speed_m_s": 2},
                {"diameter_um": 300, "fraction": 0, "settling_speed_m_s": 3},
            ],
            "domain_km": 4,
            "cell_km": 1,
            "release_layers": 1,
        },
        "receptors": [
            {"id": "center", "name": "Synthetic center", "lat": 14, "lon": 121},
            {"id": "outside", "name": "Synthetic outside", "lat": 14, "lon": 122},
        ],
        "criteria": [],
    }


def simulate(client, payload):
    response = client.post("/api/simulations", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def cdf(value):
    return (1 + math.erf(value / math.sqrt(2))) / 2


def test_scalar_mass_point_and_every_cell_match_independent_reference(client):
    result = simulate(client, request())
    mass = 100000
    point = mass / (2 * math.pi * 1000**2)
    center = result["receptors"][0]
    assert center["load_kg_m2"] == pytest.approx(point, rel=1e-12)
    assert center["thickness_mm"] == pytest.approx(point, rel=1e-12)
    expected_mass = mass * (cdf(2) - cdf(-2)) ** 2
    diagnostics = result["diagnostics"]
    assert diagnostics["inside_domain_mass_kg"] == pytest.approx(expected_mass, rel=1e-12)
    assert diagnostics["outside_domain_mass_kg"] == pytest.approx(mass - expected_mass)
    assert diagnostics["validation_status"] == "not_historically_validated"
    grid = result["grid"]
    for row_index, north in enumerate(grid["north_m"]):
        for column_index, east in enumerate(grid["east_m"]):
            x_probability = cdf((east + 500) / 1000) - cdf((east - 500) / 1000)
            y_probability = cdf((north + 500) / 1000) - cdf((north - 500) / 1000)
            expected_load = mass * x_probability * y_probability / 1000**2
            assert grid["load_kg_m2"][row_index][column_index] == pytest.approx(
                expected_load, rel=1e-12
            )
    outside = result["receptors"][1]
    assert outside["in_domain"] is False
    assert outside["load_kg_m2"] is None
    assert outside["thickness_mm"] is None
    assert outside["reported"] is None


@pytest.mark.parametrize(
    ("bearing", "east", "north"), [(0, 0, -2), (90, -2, 0), (180, 0, 2), (270, 2, 0)]
)
def test_from_bearing_and_backend_paths_use_correct_cardinal_transport(
    client, bearing, east, north
):
    payload = request()
    payload["scenario"]["wind_speed_m_s"] = 2
    payload["scenario"]["wind_from_deg"] = bearing
    result = simulate(client, payload)
    illustration = result["illustration"]
    assert illustration["wind_east_m_s"] == pytest.approx(east, abs=1e-12)
    assert illustration["wind_north_m_s"] == pytest.approx(north, abs=1e-12)
    first_path = illustration["paths"][0]
    assert first_path["points_m"][-1][0] == pytest.approx(
        east * first_path["settling_time_s"], abs=1e-9
    )
    assert first_path["points_m"][-1][1] == pytest.approx(
        north * first_path["settling_time_s"], abs=1e-9
    )
    assert first_path["points_m"][-1][2] == 0


def test_zero_mass_is_finite_zero_with_no_reported_municipality(client):
    payload = request()
    payload["scenario"]["mass_rate_kg_s"] = 0
    result = simulate(client, payload)
    assert result["diagnostics"]["inside_domain_mass_kg"] == 0
    assert result["diagnostics"]["outside_domain_mass_kg"] == 0
    assert result["receptors"][0]["load_kg_m2"] == 0
    assert result["summary"]["municipalities_reported"] == 0
    assert all(value == 0 for row in result["grid"]["thickness_mm"] for value in row)


def test_resolution_changes_cell_average_but_not_total_integrated_mass(client):
    coarse = request()
    fine = copy.deepcopy(coarse)
    fine["scenario"]["cell_km"] = 0.5
    result_coarse = simulate(client, coarse)
    result_fine = simulate(client, fine)
    assert result_coarse["diagnostics"]["inside_domain_mass_kg"] == pytest.approx(
        result_fine["diagnostics"]["inside_domain_mass_kg"], rel=1e-12
    )
    assert len(result_coarse["grid"]["east_m"]) == 4
    assert len(result_fine["grid"]["east_m"]) == 8


def test_unreviewed_criterion_stays_unknown_and_reviewed_equality_is_exceeded(client, monkeypatch):
    from abo_api import service
    from abo_api.contracts import Criterion, Source

    payload = request()
    measured = simulate(client, payload)["receptors"][0]["load_kg_m2"]
    payload["criteria"] = [
        {
            "id": "synthetic",
            "label": "Synthetic test criterion",
            "quantity": "load_kg_m2",
            "threshold": measured,
            "scope": "Test only",
            "review_status": "unreviewed",
            "source_ids": ["qa-synthetic-reference"],
            "receptor_kinds": ["municipality"],
            "required_conditions": {"qa_context": "synthetic"},
            "applicability_basis": "Synthetic fixture; no real hazard applicability claimed",
        }
    ]
    payload["screening_context"] = {"qa_context": "synthetic"}
    unreviewed = simulate(client, payload)
    assert unreviewed["receptors"][0]["screening"]["synthetic"] == "unknown"
    payload["criteria"][0]["review_status"] = "reviewed"
    # Mock only the local review registry, not numerical calculations. This
    # synthetic criterion is intentionally not packaged as real hazard data.
    catalog = service.catalog()
    catalog.criteria = [Criterion.model_validate(payload["criteria"][0])]
    catalog.sources = [
        Source(
            id="qa-synthetic-reference",
            title="Synthetic QA registry only",
            url="https://example.com/qa",
        )
    ]
    monkeypatch.setattr(service, "catalog", lambda: catalog)
    reviewed = simulate(client, payload)
    assert reviewed["receptors"][0]["screening"]["synthetic"] == "exceeded"
    assert reviewed["receptors"][1]["screening"]["synthetic"] == "unknown"


def test_caller_review_claim_cannot_certify_unknown_criterion(client):
    payload = request()
    payload["criteria"] = [
        {
            "id": "uncertified",
            "label": "Caller claim only",
            "quantity": "thickness_mm",
            "threshold": 0,
            "scope": "Synthetic test",
            "review_status": "reviewed",
            "source_ids": ["caller-asserted-source"],
        }
    ]
    result = simulate(client, payload)
    assert result["receptors"][0]["screening"]["uncertified"] == "unknown"
    assert "uncertified" not in result["summary"]["criterion_counts"]


def test_historical_metric_path_uses_held_out_synthetic_observations_only(client, monkeypatch):
    from abo_api import service
    from abo_api.contracts import HistoricalRecord

    payload = request()
    expected = 100000 / (2 * math.pi * 1000**2)
    catalog = service.catalog()
    catalog.historical = HistoricalRecord(
        available=True,
        scenario=payload["scenario"],
        observations=[
            {
                "lat": 14,
                "lon": 121,
                "lower_mm": expected,
                "upper_mm": expected,
                "split": "evaluation",
            },
            {
                "lat": 14.002,
                "lon": 121,
                "lower_mm": 1000,
                "upper_mm": 2000,
                "split": "calibration",
            },
        ],
    )
    monkeypatch.setattr(service, "catalog", lambda: catalog)
    response = client.post("/api/replications/taal-2020")
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["available"] is True
    assert result["validation_status"] == "evaluated_not_validated"
    assert result["metrics"]["rmse_mm"] == pytest.approx(0, abs=1e-12)
    assert result["metrics"]["median_factor_error"] == pytest.approx(1, rel=1e-12)
    assert result["metrics"]["footprint_iou"] is None


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("initial_spread_m", 0),
        ("bulk_density_kg_m3", 0),
        ("duration_s", -1),
        ("column_height_m", -1),
        ("wind_from_deg", 360),
        ("cell_km", 0.01),
        ("initial_spread_m", 1e-200),
        ("bulk_density_kg_m3", 1e-320),
    ],
)
def test_invalid_physical_inputs_rejected(client, field, value):
    payload = request()
    payload["scenario"][field] = value
    response = client.post("/api/simulations", json=payload)
    assert response.status_code == 422


def test_duplicate_receptor_identifiers_are_rejected(client):
    payload = request()
    payload["receptors"].append(copy.deepcopy(payload["receptors"][0]))
    response = client.post("/api/simulations", json=payload)
    assert response.status_code in (400, 422)


def test_invalid_fractions_are_rejected_without_normalization(client):
    payload = request()
    payload["scenario"]["grains"][0]["fraction"] = 0.5
    assert client.post("/api/simulations", json=payload).status_code == 422


def test_near_zero_settling_speed_is_rejected_as_noncomputable(client):
    payload = request()
    payload["scenario"]["grains"][0]["settling_speed_m_s"] = 1e-320
    assert client.post("/api/simulations", json=payload).status_code == 422


def test_single_cell_domain_does_not_crash_contour_generation(client):
    payload = request()
    payload["scenario"]["domain_km"] = 1
    response = client.post("/api/simulations", json=payload)
    assert response.status_code in (200, 422)


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -float("inf")])
def test_nonfinite_raw_json_is_rejected_without_error_handler_crash(value):
    payload = request()
    payload["scenario"]["wind_speed_m_s"] = value
    response = TestClient(app, raise_server_exceptions=False).post(
        "/api/simulations",
        content=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code in (400, 422), response.text


def test_calm_sweep_tie_uses_lowest_angle_and_outside_is_unknown(client):
    response = client.post("/api/wind-sweeps", json=request())
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["step_deg"] == 1
    assert result["receptors"][0]["wind_from_deg"] == 0
    assert result["receptors"][1]["wind_from_deg"] is None
    assert result["receptors"][1]["maximum_thickness_mm"] is None


def test_multi_grain_release_sum_matches_scalar_reference(client):
    payload = request()
    scenario = payload["scenario"]
    scenario.update(
        column_height_m=3000,
        release_layers=16,
        diffusivity_m2_s=200,
        initial_spread_m=250,
        wind_speed_m_s=10,
        wind_from_deg=270,
    )
    fractions = [0.2, 0.3, 0.5]
    velocities = [1, 4, 8]
    for grain, fraction, speed in zip(scenario["grains"], fractions, velocities, strict=True):
        grain.update(fraction=fraction, settling_speed_m_s=speed)
    expected = 0
    for fraction, velocity in zip(fractions, velocities, strict=True):
        for layer in range(16):
            fall_time = (3000 * (layer + 0.5) / 16) / velocity
            variance = 250**2 + 2 * 200 * fall_time
            expected += (
                100000
                * fraction
                / 16
                / (2 * math.pi * variance)
                * math.exp(-((10 * fall_time) ** 2) / (2 * variance))
            )
    observed = simulate(client, payload)["receptors"][0]["load_kg_m2"]
    assert observed == pytest.approx(expected, rel=1e-12)


def test_population_counts_exclude_facilities_and_show_unknown_population(client):
    payload = request()
    payload["scenario"]["mass_rate_kg_s"] = 1e8
    payload["receptors"] = [
        {
            "id": "known",
            "name": "Known synthetic town",
            "lat": 14,
            "lon": 121,
            "population": 500,
            "population_year": 2024,
        },
        {"id": "missing", "name": "Unknown synthetic town", "lat": 14, "lon": 121},
        {
            "id": "airport",
            "name": "Synthetic airport",
            "kind": "airport",
            "lat": 14,
            "lon": 121,
            "population": 900,
            "population_year": 2024,
        },
        {
            "id": "outside",
            "name": "Outside synthetic town",
            "lat": 14,
            "lon": 122,
            "population": 1000,
            "population_year": 2024,
        },
    ]
    result = simulate(client, payload)
    assert result["summary"]["municipalities_reported"] == 2
    assert result["summary"]["indicative_population"] == 500
    assert result["summary"]["reported_population_unknown"] == 1
    assert result["summary"]["receptors_covered"] == 3
    assert result["receptors"][2]["screening"]["surface_exposure"] == "exceeded"


def test_sweep_maximum_reproduces_selected_single_simulation(client):
    payload = request()
    payload["scenario"]["wind_speed_m_s"] = 2
    payload["receptors"] = [{"id": "east", "name": "Synthetic east", "lat": 14, "lon": 121.01}]
    response = client.post("/api/wind-sweeps", json=payload)
    assert response.status_code == 200, response.text
    maximum = response.json()["receptors"][0]
    assert maximum["wind_from_deg"] == 270
    payload["scenario"]["wind_from_deg"] = maximum["wind_from_deg"]
    single = simulate(client, payload)["receptors"][0]
    assert maximum["maximum_load_kg_m2"] == pytest.approx(single["load_kg_m2"], rel=1e-12)


def test_sweep_budget_rejected_before_large_allocation(client):
    payload = request()
    payload["scenario"]["release_layers"] = 32
    payload["scenario"]["grains"].extend(
        [
            {"diameter_um": 400, "fraction": 0, "settling_speed_m_s": 4},
            {"diameter_um": 500, "fraction": 0, "settling_speed_m_s": 5},
        ]
    )
    payload["receptors"] = [
        {"id": str(index), "name": "Synthetic budget receptor", "lat": 14, "lon": 121}
        for index in range(2048)
    ]
    response = client.post("/api/wind-sweeps", json=payload)
    assert response.status_code == 422
    assert "memory" in response.json()["detail"].lower()


def test_computational_module_has_no_python_loop_or_vectorize_wrapper():
    source_path = Path(__file__).resolve().parents[1] / "backend/src/abo_api/kernel.py"
    tree = ast.parse(source_path.read_text(encoding="utf-8"))
    prohibited = (
        ast.For,
        ast.AsyncFor,
        ast.While,
        ast.ListComp,
        ast.SetComp,
        ast.DictComp,
        ast.GeneratorExp,
    )
    assert not any(isinstance(node, prohibited) for node in ast.walk(tree))
    assert not any(
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "vectorize"
        for node in ast.walk(tree)
    )
