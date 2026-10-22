"""Independent Oct 12 references; synthetic inputs are never production evidence."""

import json
import math
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from abo_api import eruption, kernel, service
from abo_api.contracts import EruptionRequest, SimulationRequest
from abo_api.main import app

ROOT = Path(__file__).resolve().parents[2]


def request(**changes):
    scenario = next(
        s for s in service.catalog().scenarios if s.id == "taal-teaching"
    ).scenario.model_dump()
    scenario.update(
        column_height_m=1000,
        wind_speed_m_s=0,
        diffusivity_m2_s=0,
        initial_spread_m=1000,
        mass_rate_kg_s=100,
        duration_s=1000,
        domain_km=4,
        cell_km=1,
        release_layers=2,
        wind_profile=None,
        umbrella_radius_m=None,
    )
    scenario.update(changes)
    return SimulationRequest(scenario=scenario, receptors=[])


@pytest.mark.parametrize("bearing", [0, 90, 180, 270])
def test_cardinal_transport_matches_scalar_bearing(bearing):
    east, north = kernel.wind_components(12, bearing)
    assert east == pytest.approx(-12 * math.sin(math.radians(bearing)), abs=1e-12)
    assert north == pytest.approx(-12 * math.cos(math.radians(bearing)), abs=1e-12)


def test_calm_exact_cells_match_scalar_erf_and_point_units():
    result = service.simulate(request())
    mass = 100000
    edges = [-2000, -1000, 0, 1000, 2000]
    for row in range(4):
        for col in range(4):
            px = (
                math.erf(edges[col + 1] / math.sqrt(2e6)) - math.erf(edges[col] / math.sqrt(2e6))
            ) / 2
            py = (
                math.erf(edges[row + 1] / math.sqrt(2e6)) - math.erf(edges[row] / math.sqrt(2e6))
            ) / 2
            assert result.grid.load_kg_m2[row][col] == pytest.approx(mass * px * py / 1e6)
    expected_inside = mass * math.erf(2000 / math.sqrt(2e6)) ** 2
    assert result.diagnostics.inside_domain_mass_kg == pytest.approx(expected_inside)
    assert (
        result.diagnostics.inside_domain_mass_kg + result.diagnostics.outside_domain_mass_kg
    ) == pytest.approx(mass)


def test_finite_emission_parcel_and_grid_mass_have_independent_balance():
    seq = eruption.sequence(EruptionRequest(simulation=request()))
    fractions = [g.fraction for g in seq.scenario.grains]
    speeds = [g.settling_speed_m_s for g in seq.scenario.grains]
    loads = []
    for frame in seq.frames:
        arrived = sum(
            100000 * fraction / 2 * min(max((frame.elapsed_s - h / speed) / 1000, 0), 1)
            for fraction, speed in zip(fractions, speeds, strict=True)
            for h in [250, 750]
        )
        emitted = 100 * min(frame.elapsed_s, 1000)
        assert frame.diagnostics.deposited_mass_kg == pytest.approx(arrived, abs=1e-8)
        assert sum(p.mass_kg for p in frame.plume_parcels) == pytest.approx(
            emitted - arrived, abs=1e-8
        )
        assert (
            frame.diagnostics.inside_domain_mass_kg
            + frame.diagnostics.outside_domain_mass_kg
            + frame.diagnostics.airborne_mass_kg
        ) == pytest.approx(emitted, abs=1e-8)
        loads.append(np.asarray(frame.grid.load_kg_m2))
    assert np.all(np.diff(np.stack(loads), axis=0) >= -1e-12)
    np.testing.assert_allclose(
        seq.frames[-1].grid.load_kg_m2, seq.final_grid.load_kg_m2, rtol=1e-13, atol=1e-15
    )


@pytest.mark.parametrize("year", [2020, 2024])
@pytest.mark.parametrize("workflow", ["simulate", "sweep", "sequence"])
def test_custom_receptor_census_selection_is_authoritative(year, workflow):
    base = request(mass_rate_kg_s=1e7)
    receptor = {
        "id": "independent-census",
        "name": "Synthetic count fixture",
        "lat": base.scenario.vent_lat,
        "lon": base.scenario.vent_lon,
        "population": 99,
        "population_year": 2024,
        "population_records": {"2020": 12, "2024": 99},
    }
    req = SimulationRequest(scenario=base.scenario, receptors=[receptor], population_year=year)
    if workflow == "sequence":
        row = eruption.sequence(EruptionRequest(simulation=req)).frames[-1].receptors[0]
    else:
        row = getattr(service, workflow)(req).receptors[0]
    assert row.population_year == year
    assert row.population == (12 if year == 2020 else 99)


@pytest.mark.parametrize("records", [{}, {"2020": None, "2024": 99}])
def test_custom_missing_census_does_not_use_current_count(records):
    base = request(mass_rate_kg_s=1e7)
    req = SimulationRequest(
        scenario=base.scenario,
        population_year=2020,
        receptors=[
            {
                "id": "unknown-count",
                "name": "Synthetic missing count",
                "lat": base.scenario.vent_lat,
                "lon": base.scenario.vent_lon,
                "population": 99,
                "population_year": 2024,
                "population_records": records,
            }
        ],
    )
    out = service.simulate(req)
    assert out.receptors[0].population is None
    assert out.summary.indicative_population == 0
    assert out.summary.reported_population_unknown == 1


def test_historical_evidence_does_not_fabricate_empirical_prediction():
    result = service.replication()
    assert not result.available
    assert result.simulation is None
    assert not result.metrics
    assert result.reference_footprints
    assert result.protocol.id == "taal-main-plume-2020-v1"
    assert result.blocked_inputs


def test_saved_manuscript_mass_example_reproduces():
    req = EruptionRequest.model_validate_json(
        (ROOT / "data/examples/mayon-eruption-request.json").read_text()
    )
    req.simulation.receptors = []
    seq = eruption.sequence(req)
    last = seq.frames[-1]
    assert last.elapsed_s == pytest.approx(100475)
    assert last.diagnostics.inside_domain_mass_kg == pytest.approx(30459336.28543452)
    assert last.diagnostics.outside_domain_mass_kg == pytest.approx(5540663.714565478)
    assert last.diagnostics.airborne_mass_kg == pytest.approx(0)
    assert json.loads(seq.model_dump_json())["scenario"]["input_status"] == "illustrative"


@pytest.mark.parametrize("endpoint", ["simulations", "wind-sweeps", "eruption-sequences"])
def test_api_preserves_requested_census_for_custom_records(endpoint):
    base = request(mass_rate_kg_s=1e7)
    payload = {
        "scenario": base.scenario.model_dump(),
        "population_year": 2020,
        "receptors": [
            {
                "id": "api-census",
                "name": "Synthetic API census",
                "lat": base.scenario.vent_lat,
                "lon": base.scenario.vent_lon,
                "population": 99,
                "population_year": 2024,
            }
        ],
    }
    if endpoint == "eruption-sequences":
        payload = {"simulation": payload}
    response = TestClient(app).post(f"/api/{endpoint}", json=payload)
    assert response.status_code == 200
    data = response.json()
    rows = (
        data["frames"][-1]["receptors"] if endpoint == "eruption-sequences" else data["receptors"]
    )
    assert rows[0]["population_year"] == 2020
    assert rows[0]["population"] is None


def test_nonfinite_api_input_rejects_without_echoing_invalid_json():
    payload = request().model_dump_json().replace('"wind_speed_m_s":0.0', '"wind_speed_m_s":NaN')
    assert "NaN" in payload
    response = TestClient(app).post(
        "/api/simulations", content=payload, headers={"content-type": "application/json"}
    )
    assert response.status_code == 422
    assert "NaN" not in response.text
    assert response.json()["detail"]


@pytest.mark.parametrize("kind", ["airport", "water"])
def test_valid_facility_population_preserves_year_but_never_counts_people(kind):
    base = request(mass_rate_kg_s=1e7)
    req = SimulationRequest(
        scenario=base.scenario,
        population_year=2024,
        receptors=[
            {
                "id": "facility",
                "name": "Synthetic facility with explicit population metadata",
                "kind": kind,
                "lat": base.scenario.vent_lat,
                "lon": base.scenario.vent_lon,
                "population": 900,
                "population_year": 2024,
            }
        ],
    )
    out = service.simulate(req)
    assert out.receptors[0].population == 900
    assert out.receptors[0].population_year == 2024
    assert out.summary.indicative_population == 0
    assert out.summary.municipalities_reported == 0
