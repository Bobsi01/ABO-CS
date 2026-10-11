"""Independent synthetic references for the finite ash pulse and D8 lava teaching model.

Run from backend: uv run pytest ../qa/test_eruption_audit.py -q
Expected deposition is scalar arithmetic, without importing the ash kernel.
"""

import copy
import json
import math
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from abo_api import eruption, service
from abo_api.contracts import EruptionOptions, EruptionRequest
from abo_api.eruption import channel_routing, sequence
from abo_api.main import app


def payload():
    return {
        "simulation": {
            "scenario": {
                "volcano_id": "custom",
                "label": "Independent synthetic finite pulse",
                "vent_lat": 0,
                "vent_lon": 0,
                "vent_elevation_m": 0,
                "column_height_m": 800,
                "mass_rate_kg_s": 200,
                "duration_s": 60,
                "wind_speed_m_s": 7,
                "wind_from_deg": 90,
                "diffusivity_m2_s": 11,
                "initial_spread_m": 300,
                "bulk_density_kg_m3": 800,
                "grains": [
                    {"diameter_um": 100, "fraction": 0.5, "settling_speed_m_s": 1},
                    {"diameter_um": 200, "fraction": 0.3, "settling_speed_m_s": 2},
                    {"diameter_um": 400, "fraction": 0.2, "settling_speed_m_s": 4},
                ],
                "domain_km": 4,
                "cell_km": 1,
                "release_layers": 2,
            },
            "receptors": [
                {"id": "vent", "name": "Synthetic vent", "lat": 0, "lon": 0},
                {"id": "outside", "name": "Outside", "lat": 0, "lon": 1},
            ],
            "criteria": [],
        },
        "options": {"frame_count": 25},
    }


def reference_components(scenario, elapsed):
    result = []
    for grain in scenario.grains:
        for layer in range(scenario.release_layers):
            height = scenario.column_height_m * (layer + 0.5) / scenario.release_layers
            tau = height / grain.settling_speed_m_s
            weight = scenario.mass_rate_kg_s * scenario.duration_s * grain.fraction
            weight /= scenario.release_layers
            arrived = weight * min(1, max(0, (elapsed - tau) / scenario.duration_s))
            variance = scenario.initial_spread_m**2 + 2 * scenario.diffusivity_m2_s * tau
            angle = math.radians(scenario.wind_from_deg)
            mean_e = -scenario.wind_speed_m_s * math.sin(angle) * tau
            mean_n = -scenario.wind_speed_m_s * math.cos(angle) * tau
            result.append((tau, arrived, variance, mean_e, mean_n))
    return result


def cdf(value):
    return 0.5 * math.erfc(-value / math.sqrt(2))


def test_each_frame_every_cell_and_vent_match_scalar_reference():
    result = sequence(EruptionRequest.model_validate(payload()))
    scenario = result.scenario
    for frame in result.frames:
        components = reference_components(scenario, frame.elapsed_s)
        for row, north in enumerate(frame.grid.north_m):
            for col, east in enumerate(frame.grid.east_m):
                expected = 0
                half = frame.grid.cell_m / 2
                for _, mass, variance, mean_e, mean_n in components:
                    sigma = math.sqrt(variance)
                    px = cdf((east + half - mean_e) / sigma) - cdf((east - half - mean_e) / sigma)
                    py = cdf((north + half - mean_n) / sigma) - cdf((north - half - mean_n) / sigma)
                    expected += mass * px * py / frame.grid.cell_m**2
                assert frame.grid.load_kg_m2[row][col] == pytest.approx(
                    expected, rel=1e-10, abs=1e-17
                )
        expected_point = sum(
            mass / (2 * math.pi * variance) * math.exp(-(e**2 + n**2) / (2 * variance))
            for _, mass, variance, e, n in components
        )
        assert frame.receptors[0].load_kg_m2 == pytest.approx(expected_point, abs=1e-17)
        assert frame.receptors[0].thickness_mm == pytest.approx(
            expected_point * 1000 / scenario.bulk_density_kg_m3, abs=1e-17
        )
        assert frame.receptors[1].load_kg_m2 is None
        assert frame.receptors[1].reported is None


def test_clock_mass_closure_monotonicity_and_eventual_equivalence():
    result = sequence(EruptionRequest.model_validate(payload()))
    duration = result.scenario.duration_s
    expected_last = duration + 600  # Highest layer / slowest speed, not H/2.
    assert result.frames[0].elapsed_s == 0
    assert result.frames[-1].elapsed_s == expected_last
    assert any(frame.elapsed_s == duration for frame in result.frames)
    previous = np.zeros((4, 4))
    for frame in result.frames:
        diag = frame.diagnostics
        expected_deposit = sum(
            component[1] for component in reference_components(result.scenario, frame.elapsed_s)
        )
        assert diag.emitted_mass_kg == pytest.approx(200 * min(frame.elapsed_s, duration))
        assert diag.deposited_mass_kg == pytest.approx(expected_deposit)
        assert diag.emitted_mass_kg == pytest.approx(
            diag.inside_domain_mass_kg + diag.outside_domain_mass_kg + diag.airborne_mass_kg,
            abs=1e-8,
        )
        grid = np.asarray(frame.grid.load_kg_m2)
        assert np.all(grid >= previous - 1e-16)
        assert diag.inside_domain_mass_kg == pytest.approx(grid.sum() * 1e6, abs=1e-8)
        assert all(value >= 0 for value in diag.model_dump().values())
        assert sum(parcel.mass_kg for parcel in frame.plume_parcels) == pytest.approx(
            diag.airborne_mass_kg, abs=1e-8
        )
        previous = grid
    assert np.asarray(result.frames[-1].grid.load_kg_m2) == pytest.approx(
        np.asarray(result.final_grid.load_kg_m2), abs=1e-16
    )
    stop_frame = next(frame for frame in result.frames if frame.elapsed_s == duration)
    assert stop_frame.diagnostics.airborne_mass_kg > 0
    assert (
        result.frames[-1].diagnostics.deposited_mass_kg > stop_frame.diagnostics.deposited_mass_kg
    )
    assert result.frames[-1].plume_parcels == []
    assert result.frames[-1].column_top_m == 0


@pytest.mark.parametrize("volcano_id", ["custom", "taal"])
def test_zero_ash_has_no_cloud_fountain_or_ground_deposit(volcano_id):
    data = payload()
    data["simulation"]["scenario"].update(mass_rate_kg_s=0, volcano_id=volcano_id)
    result = sequence(EruptionRequest.model_validate(data))
    assert result.fountain_paths_m == []
    for frame in result.frames:
        assert not frame.plume_parcels
        assert not frame.fountain_particles_m
        assert frame.column_top_m == 0
        assert not np.asarray(frame.grid.load_kg_m2).any()
        assert all(value == 0 for value in frame.diagnostics.model_dump().values())


def test_cloud_parcels_obey_wind_and_are_mass_envelopes():
    data = payload()
    data["simulation"]["scenario"].update(wind_from_deg=0, wind_speed_m_s=9)
    result = sequence(EruptionRequest.model_validate(data))
    active = [parcel for frame in result.frames for parcel in frame.plume_parcels]
    assert active
    assert all(abs(parcel.east_m) < 1e-8 and parcel.north_m <= 0 for parcel in active)
    assert all(0 <= parcel.height_m <= 800 and parcel.radius_m >= 300 for parcel in active)
    assert any("not concentration" in text for text in result.assumptions)


def test_visual_rise_speed_does_not_change_final_physics():
    slower = payload()
    faster = copy.deepcopy(slower)
    slower["options"]["plume_rise_speed_m_s"] = 1
    faster["options"]["plume_rise_speed_m_s"] = 300
    first = sequence(EruptionRequest.model_validate(slower))
    second = sequence(EruptionRequest.model_validate(faster))
    assert first.final_grid == second.final_grid
    assert first.frames[-1].diagnostics == second.frames[-1].diagnostics


def terrain():
    elevation = np.full((3, 3), 200.0)
    elevation[1, 1] = 100
    elevation[2, 2] = 0  # North/east diagonal, sqrt(2) * 250 m.
    elevation[1, 2] = 90
    axis = np.array([-250.0, 0, 250])
    return elevation, np.ones((3, 3)), axis, axis


def options(**kwargs):
    return EruptionOptions(
        lava_effusion_m3_s=8,
        lava_width_m=4,
        lava_viscosity_pa_s=1200,
        lava_density_kg_m3=2500,
        **kwargs,
    )


def test_lava_diagonal_slope_and_discharge_are_dimensionally_consistent():
    e, n, z, arrival, depth, speed, stop = channel_routing(*terrain(), 4, options(), 10000)
    assert e.tolist() == [0, 250]
    assert n.tolist() == [0, 250]
    assert z.tolist() == [100, 0]
    length = math.sqrt(2) * 250
    sine = 100 / math.hypot(length, 100)
    expected_depth = (3 * 1200 * 8 / (2500 * 9.80665 * sine * 4)) ** (1 / 3)
    expected_speed = 8 / (4 * expected_depth)
    assert depth[0] == pytest.approx(expected_depth)
    assert speed[0] == pytest.approx(expected_speed)
    surface_length = math.hypot(length, 100)
    assert arrival[1] == pytest.approx(surface_length / expected_speed)
    assert depth[0] * 4 * surface_length == pytest.approx(8 * arrival[1])
    assert stop == "terrain_edge"


@pytest.mark.parametrize(
    ("kind", "expected"),
    [
        ("pit", "pit_or_flat"),
        ("water", "water"),
        ("duration", "effusion_volume_limit"),
        ("distance", "distance_limit"),
    ],
)
def test_lava_stops_honestly_at_route_limits(kind, expected):
    elevation, mask, east, north = terrain()
    duration = 10000
    settings = options()
    if kind == "pit":
        elevation[:] = 200
        elevation[1, 1] = 0
    elif kind == "water":
        mask[1, 1] = 2
    elif kind == "duration":
        duration = 1
    else:
        settings = options(lava_max_distance_m=250)
    e, n, z, arrival, depth, speed, stop = channel_routing(
        elevation, mask, east, north, 4, settings, duration
    )
    assert stop == expected
    if kind in {"pit", "water"}:
        assert len(e) == 1
        assert arrival.tolist() == [0]
    else:
        assert len(e) == 2
        length = math.hypot(e[-1], n[-1])
        surface_length = math.hypot(length, z[-1] - z[0])
        if kind == "duration":
            assert arrival[-1] == pytest.approx(duration)
            assert surface_length == pytest.approx(speed[0] * duration)
        else:
            assert length == pytest.approx(250)
        assert z[-1] == pytest.approx(100 * (1 - length / (250 * math.sqrt(2))))
        assert 4 * depth[0] * surface_length == pytest.approx(8 * arrival[-1])


def test_taal_effusion_is_not_invented_from_fountain_evidence():
    data = payload()
    data["simulation"]["scenario"]["volcano_id"] = "taal"
    data["options"]["include_lava"] = True
    result = sequence(EruptionRequest.model_validate(data))
    assert not result.lava.enabled
    assert not result.lava.path
    assert not result.lava.footprint.features
    assert result.fountain_paths_m
    assert "not a 2020 reenactment" in result.fountain_label


@pytest.mark.parametrize("field", ["plume_rise_speed_m_s", "lava_viscosity_pa_s", "lava_width_m"])
def test_new_option_contract_rejects_nonfinite_values(field):
    data = payload()
    data["options"][field] = float("nan")
    with pytest.raises(ValueError):
        EruptionRequest.model_validate(data)


def test_api_sequence_contract_and_final_state():
    client = TestClient(app)
    response = client.post("/api/eruption-sequences", json=payload())
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["solver_version"] == "abo-finite-pulse-1.0"
    assert result["frames"][0]["phase"] == "before"
    assert result["frames"][-1]["phase"] == "after"
    assert any("not CFD" in warning for warning in result["warnings"])
    assert result["lava"]["model_label"].endswith("not a hazard forecast")
    assert result["provenance"]["input_status"] == "user_entered"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("frame_count", 50),
        ("frame_count", 0),
        ("lava_width_m", 0),
        ("plume_rise_speed_m_s", float("inf")),
    ],
)
def test_api_rejects_invalid_sequence_inputs(field, value):
    data = payload()
    data["options"][field] = value
    response = TestClient(app).post(
        "/api/eruption-sequences",
        content=json.dumps(data),
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 422
    assert "detail" in response.json()


def test_sequence_budget_rejected_before_frame_tensor_allocation(monkeypatch):
    monkeypatch.setattr(eruption.kernel, "MEMORY_LIMIT_BYTES", 100000)

    def forbidden_allocation(*args, **kwargs):
        pytest.fail("Frame allocation was attempted before sequence budget admission")

    monkeypatch.setattr(eruption, "sequence_grids", forbidden_allocation)
    response = TestClient(app).post("/api/eruption-sequences", json=payload())
    assert response.status_code == 422
    assert "512 MiB" in response.json()["detail"]


def test_real_mayon_route_uses_raw_dem_and_unsupported_vent_stays_unavailable():
    preset = next(
        item for item in service.catalog().scenarios if item.scenario.volcano_id == "mayon"
    )
    data = payload()
    data["simulation"]["scenario"] = preset.scenario.model_dump()
    data["options"]["include_lava"] = True
    request = EruptionRequest.model_validate(data)
    lava = eruption.lava_result(request, request.simulation.receptors)
    assert lava.enabled
    assert len(lava.path) > 1
    terrain_path = Path(eruption.TERRAIN_DIRECTORY) / "mayon.json"
    raw = json.loads(terrain_path.read_text(encoding="utf-8"))
    elevations = []
    for index, point in enumerate(lava.path):
        if index == len(lava.path) - 1 and point.east_m not in raw["east_m"]:
            previous = lava.path[index - 1]
            row = raw["north_m"].index(previous.north_m)
            col = raw["east_m"].index(previous.east_m)
            delta_e = point.east_m - previous.east_m
            delta_n = point.north_m - previous.north_m
            next_row = row + int(np.sign(delta_n))
            next_col = col + int(np.sign(delta_e))
            length = math.hypot(delta_e, delta_n)
            full_length = math.hypot(
                raw["east_m"][next_col] - previous.east_m,
                raw["north_m"][next_row] - previous.north_m,
            )
            expected_z = previous.elevation_m + length / full_length * (
                raw["elevation_m"][next_row][next_col] - previous.elevation_m
            )
            assert point.elevation_m == pytest.approx(expected_z)
            elevations.append(point.elevation_m)
            continue
        row = raw["north_m"].index(point.north_m)
        col = raw["east_m"].index(point.east_m)
        elevations.append(point.elevation_m)
        assert point.elevation_m == raw["elevation_m"][row][col]
        assert point.arrival_s <= request.simulation.scenario.duration_s
        assert point.width_m * point.thickness_m * point.speed_m_s == pytest.approx(5)
    assert np.all(np.diff(elevations) < 0)
    channel_volume = sum(
        a.width_m
        * a.thickness_m
        * math.sqrt(
            (b.east_m - a.east_m) ** 2
            + (b.north_m - a.north_m) ** 2
            + (b.elevation_m - a.elevation_m) ** 2
        )
        for a, b in zip(lava.path[:-1], lava.path[1:], strict=True)
    )
    assert channel_volume == pytest.approx(5 * lava.path[-1].arrival_s)
    assert lava.footprint.features[0]["properties"]["quantity"] == "illustrative_channel_footprint"
    assert any("unknown continuation" in warning for warning in lava.warnings)
    request.simulation.scenario.vent_lat += 0.01
    moved = eruption.lava_result(request, request.simulation.receptors)
    assert not moved.enabled
    assert moved.stop_reason == "terrain_origin_differs_from_vent"
