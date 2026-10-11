"""Fresh independent QA cases; all physical inputs here are synthetic.

Run from backend: uv run pytest ../qa/test_further_scientific_qa.py
Expected wind peaks use scalar polar geometry. Lava uses inclined scalar lengths.
"""

import json
import math

import numpy as np
import pytest
from fastapi.testclient import TestClient

from abo_api import eruption, service
from abo_api.contracts import (
    EruptionOptions,
    EruptionRequest,
    Receptor,
    SimulationRequest,
)
from abo_api.main import app


def synthetic_scenario(**changes):
    scenario = {
        "volcano_id": "custom",
        "label": "Further independent synthetic audit",
        "input_status": "illustrative",
        "vent_lat": 0,
        "vent_lon": 0,
        "vent_elevation_m": 0,
        "column_height_m": 1000,
        "mass_rate_kg_s": 10,
        "duration_s": 100,
        "wind_speed_m_s": 10,
        "wind_from_deg": 225,
        "diffusivity_m2_s": 3,
        "initial_spread_m": 250,
        "bulk_density_kg_m3": 800,
        "grains": [
            {"diameter_um": 10, "fraction": 0.5, "settling_speed_m_s": 1},
            {"diameter_um": 20, "fraction": 0.3, "settling_speed_m_s": 2},
            {"diameter_um": 40, "fraction": 0.2, "settling_speed_m_s": 4},
        ],
        "release_layers": 1,
        "domain_km": 4,
        "cell_km": 1,
    }
    scenario.update(changes)
    return scenario


@pytest.mark.parametrize("speed", [0, 3, 10, 100])
def test_isotropic_vent_worst_wind_tie_uses_zero_degrees(speed):
    request = SimulationRequest(
        scenario=synthetic_scenario(wind_speed_m_s=speed),
        receptors=[{"id": "vent", "name": "Synthetic vent", "lat": 0, "lon": 0}],
    )
    receptor = service.sweep(request).receptors[0]
    assert receptor.wind_from_deg == 0
    expected = sum(
        1000
        * grain["fraction"]
        / (2 * math.pi * (250**2 + 2 * 3 * (500 / grain["settling_speed_m_s"])))
        * math.exp(
            -((speed * 500 / grain["settling_speed_m_s"]) ** 2)
            / (2 * (250**2 + 2 * 3 * (500 / grain["settling_speed_m_s"])))
        )
        for grain in synthetic_scenario()["grains"]
    )
    assert receptor.maximum_load_kg_m2 == pytest.approx(expected, rel=1e-12, abs=1e-300)


@pytest.mark.parametrize("bearing", [37, 121, 269, 315])
def test_off_vent_sweep_preserves_true_directional_peak(bearing):
    # Independent WGS84 equatorial geodesic fixture: a 1 km point at bearing b.
    from pyproj import Geod

    lon, lat, _ = Geod(ellps="WGS84").fwd(0, 0, bearing, 1000)
    request = SimulationRequest(
        scenario=synthetic_scenario(),
        receptors=[{"id": "point", "name": "Synthetic off-vent", "lat": lat, "lon": lon}],
    )
    receptor = service.sweep(request).receptors[0]
    expected_from = (bearing + 180) % 360
    assert receptor.wind_from_deg == expected_from
    # A scalar radial/cosine reference; no vector wind conversion from the solver.
    expected = sum(
        1000
        * grain["fraction"]
        / (2 * math.pi * (250**2 + 2 * 3 * (500 / grain["settling_speed_m_s"])))
        * math.exp(
            -((1000 - 10 * 500 / grain["settling_speed_m_s"]) ** 2)
            / (2 * (250**2 + 2 * 3 * (500 / grain["settling_speed_m_s"])))
        )
        for grain in synthetic_scenario()["grains"]
    )
    assert receptor.maximum_load_kg_m2 == pytest.approx(expected, rel=1e-10)


def test_unrepresentable_post_emission_clock_is_rejected_at_api():
    # Legal finite SI fields can nevertheless have tau smaller than ULP(T).
    payload = {
        "simulation": {
            "scenario": synthetic_scenario(column_height_m=1e-12, duration_s=31536000),
            "receptors": [],
        },
        "options": {"frame_count": 37},
    }
    response = TestClient(app).post("/api/eruption-sequences", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()


@pytest.mark.parametrize("duration", [0.001, 3600, 31536000])
def test_representable_clock_retains_requested_count_and_source_stop(duration):
    request = EruptionRequest(
        simulation=SimulationRequest(
            scenario=synthetic_scenario(duration_s=duration), receptors=[]
        ),
        options=EruptionOptions(frame_count=49),
    )
    result = eruption.sequence(request)
    times = [frame.elapsed_s for frame in result.frames]
    assert len(times) == 49
    assert times[0] == 0
    assert all(b > a for a, b in zip(times[:-1], times[1:], strict=True))
    assert duration in times
    assert times[-1] == duration + 500
    assert result.frames[-1].phase == "after"


@pytest.mark.parametrize("elapsed", [50, 150, 400, 550, 600])
def test_quantile_parcel_age_moments_match_finite_emission_interval(elapsed):
    # New check of each component's mass-weighted center, not merely total mass.
    arrays = eruption.airborne_parcels(
        np.array([elapsed]),
        1000,
        np.array([1, 2, 4]),
        1,
        np.array([0.5, 0.3, 0.2]),
        10,
        100,
        -7,
        4,
        3,
        250,
    )
    east, north, height, radius, mass, _ = [array[0] for array in arrays]
    for index, (fraction, speed) in enumerate([(0.5, 1), (0.3, 2), (0.2, 4)]):
        oldest = min(elapsed, 500 / speed)
        youngest = max(0, elapsed - 100)
        width = max(0, oldest - youngest)
        assert mass[index].sum() == pytest.approx(10 * fraction * width)
        if width == 0:
            continue
        mean_age = (oldest + youngest) / 2
        assert np.dot(east[index], mass[index]) / mass[index].sum() == pytest.approx(-7 * mean_age)
        assert np.dot(north[index], mass[index]) / mass[index].sum() == pytest.approx(4 * mean_age)
        assert np.dot(height[index], mass[index]) / mass[index].sum() == pytest.approx(
            500 - speed * mean_age
        )
        ages = -east[index] / 7
        assert radius[index] ** 2 == pytest.approx(250**2 + 2 * 3 * ages)


def test_coarse_frame_mass_matches_native_final_mass():
    request = EruptionRequest(
        simulation=SimulationRequest(scenario=synthetic_scenario(domain_km=60), receptors=[]),
        options=EruptionOptions(frame_count=25),
    )
    result = eruption.sequence(request)
    assert len(result.final_grid.east_m) == 60
    assert len(result.frames[-1].grid.east_m) == 50
    final = result.frames[-1]
    coarse_mass = np.asarray(final.grid.load_kg_m2).sum() * final.grid.cell_m**2
    native_mass = np.asarray(result.final_grid.load_kg_m2).sum() * result.final_grid.cell_m**2
    assert coarse_mass == pytest.approx(native_mass, rel=1e-12)
    for frame in result.frames:
        integral = np.asarray(frame.grid.load_kg_m2).sum() * frame.grid.cell_m**2
        assert integral == pytest.approx(frame.diagnostics.inside_domain_mass_kg, rel=1e-12)


def test_variable_slope_lava_uses_normal_depth_inclined_length_and_volume():
    elevation = np.full((5, 5), 3000.0)
    elevation[2, 1:] = [1000, 500, 300, 100]
    axis = np.array([-500.0, -250, 0, 250, 500])
    options = EruptionOptions(
        lava_effusion_m3_s=5,
        lava_width_m=20,
        lava_viscosity_pa_s=1000,
        lava_density_kg_m3=2600,
    )
    east, north, z, arrived, depth, velocity, stop = eruption.channel_routing(
        elevation, np.ones((5, 5)), axis, axis, 11, options, 10000
    )
    assert east.tolist() == [-250, 0, 250, 500]
    assert north.tolist() == [0, 0, 0, 0]
    expected_time = 0
    expected_volume = 0
    for i, drop in enumerate([500, 200, 200]):
        slope_length = math.hypot(250, drop)
        sine = drop / slope_length
        expected_depth = (3 * 1000 * 5 / (2600 * 9.80665 * 20 * sine)) ** (1 / 3)
        expected_speed = 5 / (20 * expected_depth)
        expected_time += slope_length / expected_speed
        expected_volume += 20 * expected_depth * slope_length
        assert depth[i] == pytest.approx(expected_depth)
        assert velocity[i] == pytest.approx(expected_speed)
        assert arrived[i + 1] == pytest.approx(expected_time)
        assert z[i] > z[i + 1]
    assert expected_volume == pytest.approx(5 * arrived[-1])
    assert stop == "terrain_edge"


@pytest.mark.parametrize("kind", ["airport", "water", "municipality"])
def test_missing_damage_criteria_remain_unknown_for_all_receptor_kinds(kind):
    request = SimulationRequest(
        scenario=synthetic_scenario(mass_rate_kg_s=1e8, wind_speed_m_s=0),
        receptors=[Receptor(id="r", name="Synthetic receptor", lat=0, lon=0, kind=kind)],
        criteria=[],
    )
    result = service.simulate(request)
    receptor = result.receptors[0]
    assert receptor.reported
    assert receptor.screening["roof"] == "unknown"
    assert receptor.screening["crop"] == "unknown"
    assert result.summary.criterion_counts == {}
    if kind != "municipality":
        assert receptor.screening["surface_exposure"] == "exceeded"
    else:
        assert result.summary.reported_population_unknown == 1


@pytest.mark.parametrize("malformation", ["one_sample", "nonfinite_axis", "nonuniform_axis"])
def test_invalid_local_lava_axis_fails_cleanly(malformation, tmp_path, monkeypatch):
    # Source corruption is simulated only in a temporary QA asset directory.
    size = 1 if malformation == "one_sample" else 3
    axis = [0] if size == 1 else [-250, 0, 250]
    east = axis.copy()
    if malformation == "nonfinite_axis":
        east[0] = float("nan")
    if malformation == "nonuniform_axis":
        east[-1] = 500
    terrain = {
        "origin": {"lat": 0, "lon": 0},
        "east_m": east,
        "north_m": axis,
        "elevation_m": [[1000 - 100 * col for col in range(size)] for _ in range(size)],
        "land_mask": [[1] * size for _ in range(size)],
    }
    (tmp_path / "mayon.json").write_text(json.dumps(terrain), encoding="utf-8")
    monkeypatch.setattr(eruption, "TERRAIN_DIRECTORY", tmp_path)
    payload = {
        "simulation": {"scenario": synthetic_scenario(volcano_id="mayon"), "receptors": []},
        "options": {"include_lava": True, "frame_count": 25},
    }
    response = TestClient(app, raise_server_exceptions=False).post(
        "/api/eruption-sequences", json=payload
    )
    assert response.status_code == 422
    assert "detail" in response.json()


def test_official_population_spot_checks_preserve_ids_years_and_values():
    # Independently read 2024 POPCEN columns of PSA Albay/Batangas on 2026-10-10.
    expected = {
        "0401027000": 21742,  # Santa Teresita, Batangas.
        "0401029000": 61559,  # Taal municipality, not Volcano Island.
        "0401030000": 46477,  # Talisay, Batangas.
        "0500503000": 138000,  # Daraga, Albay.
        "0500509000": 41066,  # Malilipot, Albay.
    }
    receptors = {receptor.id: receptor for receptor in service.catalog().receptors}
    for identifier, population in expected.items():
        assert receptors[identifier].population == population
        assert receptors[identifier].population_year == 2024
        assert len(identifier) == 10
