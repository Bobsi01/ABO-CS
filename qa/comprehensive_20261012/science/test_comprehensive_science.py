"""Fresh scalar/boundary QA; synthetic tests are not eruption observations."""

import math

import numpy as np
import pytest
from fastapi.testclient import TestClient
from pyproj import Geod

from abo_api import eruption, evidence, service
from abo_api.contracts import EruptionRequest, Observation, Receptor, SimulationRequest
from abo_api.main import app


def request(**changes):
    scenario = service.catalog().scenarios[0].scenario.model_dump()
    scenario.update(
        vent_lat=0,
        vent_lon=0,
        column_height_m=800,
        mass_rate_kg_s=100,
        duration_s=100,
        wind_speed_m_s=7,
        wind_from_deg=231,
        diffusivity_m2_s=19,
        initial_spread_m=100,
        bulk_density_kg_m3=1200,
        domain_km=4,
        cell_km=1,
        release_layers=2,
        grains=[
            {"diameter_um": 10, "fraction": 0.2, "settling_speed_m_s": 1},
            {"diameter_um": 20, "fraction": 0.3, "settling_speed_m_s": 2},
            {"diameter_um": 40, "fraction": 0.5, "settling_speed_m_s": 5},
        ],
    )
    scenario.update(changes)
    return SimulationRequest(scenario=scenario, receptors=[])


@pytest.mark.parametrize("preset_index", [0, 1, 2])
def test_every_bundled_preset_supports_complete_catalog_sweep(preset_index):
    data = service.catalog()
    response = TestClient(app).post(
        "/api/wind-sweeps",
        json=SimulationRequest(scenario=data.scenarios[preset_index].scenario).model_dump(),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body["receptors"]) == len(data.receptors) == 320
    assert body["step_deg"] == 1
    assert any(row["in_domain"] for row in body["receptors"])
    assert all(
        row["maximum_load_kg_m2"] is None and row["wind_from_deg"] is None
        for row in body["receptors"]
        if not row["in_domain"]
    )


@pytest.mark.parametrize("count", [320, 2048])
def test_maximum_receptor_count_sweep_matches_independent_scalar_bearings(count):
    fractions_and_speeds = [(0.1, 0.5), (0.15, 1), (0.2, 2), (0.25, 4), (0.3, 8)]
    req = request(
        release_layers=32,
        domain_km=400,
        grains=[
            {"diameter_um": (i + 1) * 10, "fraction": fraction, "settling_speed_m_s": speed}
            for i, (fraction, speed) in enumerate(fractions_and_speeds)
        ],
    )
    points = [(0, 0), (400, 0), (-850, 250), (350, -700), (900, 900)]
    geod = Geod(ellps="WGS84")
    coordinates = [
        geod.fwd(0, 0, math.degrees(math.atan2(e, n)), math.hypot(e, n))[:2] for e, n in points
    ]
    req.receptors = [
        Receptor(
            id=str(i),
            name="Synthetic duplicate-coordinate performance fixture",
            lon=coordinates[i % len(points)][0],
            lat=coordinates[i % len(points)][1],
        )
        for i in range(count)
    ]
    result = service.sweep(req)
    expected = []
    for e, n in points:
        loads = []
        for bearing in range(360):
            ue = -7 * math.sin(math.radians(bearing))
            un = -7 * math.cos(math.radians(bearing))
            load = 0.0
            for fraction, speed in fractions_and_speeds:
                for layer in range(32):
                    tau = 800 * (layer + 0.5) / 32 / speed
                    variance = 100**2 + 2 * 19 * tau
                    load += (
                        10000
                        * fraction
                        / 32
                        / (2 * math.pi * variance)
                        * math.exp(-((e - ue * tau) ** 2 + (n - un * tau) ** 2) / (2 * variance))
                    )
            loads.append(load)
        if e == 0 and n == 0:
            expected.append((loads[0], 0))
        else:
            maximum = max(loads)
            expected.append((maximum, loads.index(maximum)))
    for i, row in enumerate(result.receptors):
        load, bearing = expected[i % len(points)]
        assert row.maximum_load_kg_m2 == pytest.approx(load, rel=1e-10)
        assert row.maximum_thickness_mm == pytest.approx(load * 1000 / 1200, rel=1e-10)
        assert row.wind_from_deg == bearing


@pytest.mark.parametrize("bearing", [0, 37, 90, 179, 270, 359.999])
def test_every_cell_matches_shifted_independent_erf(bearing):
    req = request(wind_from_deg=bearing)
    result = service.simulate(req)
    ue, un = -7 * math.sin(math.radians(bearing)), -7 * math.cos(math.radians(bearing))
    edges = [-2000, -1000, 0, 1000, 2000]
    for row in range(4):
        for col in range(4):
            expected = 0.0
            for fraction, speed in [(0.2, 1), (0.3, 2), (0.5, 5)]:
                for height in (200, 600):
                    tau = height / speed
                    sigma = math.sqrt(100**2 + 38 * tau)
                    px = (
                        math.erf((edges[col + 1] - ue * tau) / (math.sqrt(2) * sigma))
                        - math.erf((edges[col] - ue * tau) / (math.sqrt(2) * sigma))
                    ) / 2
                    py = (
                        math.erf((edges[row + 1] - un * tau) / (math.sqrt(2) * sigma))
                        - math.erf((edges[row] - un * tau) / (math.sqrt(2) * sigma))
                    ) / 2
                    expected += 10000 * fraction / 2 * px * py / 1e6
            assert result.grid.load_kg_m2[row][col] == pytest.approx(expected, rel=1e-8, abs=1e-15)


@pytest.mark.parametrize("mass_rate", [0, 1e12])
def test_narrow_zero_diffusion_and_extreme_legal_mass_preserve_grid_balance(mass_rate):
    req = request(
        wind_speed_m_s=0,
        diffusivity_m2_s=0,
        initial_spread_m=0.001,
        mass_rate_kg_s=mass_rate,
        duration_s=31536000,
        bulk_density_kg_m3=0.001,
    )
    result = service.simulate(req)
    cells = np.asarray(result.grid.load_kg_m2)
    mass = mass_rate * 31536000
    assert np.isfinite(cells).all() and (cells >= 0).all()
    assert np.isfinite(result.grid.thickness_mm).all()
    assert cells.sum() * 1e6 == pytest.approx(mass, rel=1e-14)
    assert result.diagnostics.inside_domain_mass_kg == pytest.approx(mass, rel=1e-14)


@pytest.mark.parametrize("frames", [25, 37, 49])
def test_finite_sequence_receptor_samples_match_scalar_component_arrivals(frames):
    req = request(wind_speed_m_s=0)
    req.receptors = [Receptor(id="vent", name="Synthetic vent", lat=0, lon=0)]
    result = eruption.sequence(EruptionRequest(simulation=req, options={"frame_count": frames}))
    for frame in result.frames:
        expected = sum(
            10000
            * fraction
            / 2
            * min(max((frame.elapsed_s - height / speed) / 100, 0), 1)
            / (2 * math.pi * (100**2 + 38 * height / speed))
            for fraction, speed in [(0.2, 1), (0.3, 2), (0.5, 5)]
            for height in (200, 600)
        )
        assert frame.receptors[0].load_kg_m2 == pytest.approx(expected, abs=1e-16)
        assert frame.receptors[0].thickness_mm == pytest.approx(expected * 1000 / 1200)
        assert frame.diagnostics.emitted_mass_kg == pytest.approx(
            frame.diagnostics.deposited_mass_kg + frame.diagnostics.airborne_mass_kg,
            rel=1e-12,
            abs=1e-8,
        )


def test_shared_source_family_split_leakage_is_rejected():
    observations = [
        Observation(
            lat=i,
            lon=i,
            lower_mm=1,
            upper_mm=2,
            split=split,
            spatial_group=f"distinct-{i}",
            dependency_group="same-source",
        )
        for i, split in enumerate(["calibration", "evaluation"])
    ]
    with pytest.raises(ValueError, match="leakage"):
        evidence.check_split_independence(observations)


def test_blocked_historical_record_never_produces_a_prediction():
    result = service.replication()
    assert not result.available and result.simulation is None and not result.metrics
    assert result.blocked_inputs and len(result.reference_footprints) == 2


def test_illegal_scenario_extras_are_rejected_and_compute_recovers():
    client = TestClient(app)
    payload = request().model_dump()
    payload["scenario"]["terrain_physics_enabled"] = True
    rejected = client.post("/api/simulations", json=payload)
    assert rejected.status_code == 422
    accepted = client.post("/api/simulations", json=request().model_dump())
    assert accepted.status_code == 200
