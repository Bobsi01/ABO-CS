"""Independent extension regressions: synthetic inputs, no historical accuracy claim."""

import math

import numpy as np
import pytest

from abo_api import eruption, service
from abo_api.contracts import EruptionRequest, Receptor, Scenario, SimulationRequest


def synthetic(**updates):
    values = service.catalog().scenarios[0].scenario.model_dump()
    values.update(
        domain_km=20,
        cell_km=1,
        release_layers=4,
        duration_s=1000,
        mass_rate_kg_s=100,
        column_height_m=10,
        wind_speed_m_s=0,
        grains=[
            dict(diameter_um=d, fraction=f, settling_speed_m_s=10)
            for d, f in [(100, 0.4), (200, 0.3), (300, 0.3)]
        ],
    )
    values.update(updates)
    return Scenario.model_validate(values)


def test_front_loaded_pulse_frame_mass_balance():
    scenario = synthetic(
        pulses=[
            dict(start_s=0, duration_s=100, mass_rate_kg_s=1000, column_height_m=10),
            dict(start_s=900, duration_s=100, mass_rate_kg_s=0, column_height_m=10),
        ]
    )
    result = eruption.sequence(
        EruptionRequest(simulation=SimulationRequest(scenario=scenario, receptors=[]))
    )
    for frame in result.frames:
        d = frame.diagnostics
        expected = 1000 * min(frame.elapsed_s, 100)
        assert np.isclose(d.emitted_mass_kg, expected), (
            frame.elapsed_s,
            d.emitted_mass_kg,
            expected,
        )
        assert np.isclose(d.emitted_mass_kg, d.deposited_mass_kg + d.airborne_mass_kg)


def test_delayed_pulse_has_no_early_airborne_parcels():
    scenario = synthetic(
        pulses=[
            dict(start_s=900, duration_s=100, mass_rate_kg_s=1000, column_height_m=10),
        ]
    )
    result = eruption.sequence(
        EruptionRequest(simulation=SimulationRequest(scenario=scenario, receptors=[]))
    )
    for frame in result.frames:
        if frame.elapsed_s < 900:
            assert not frame.plume_parcels, frame.elapsed_s
            assert frame.diagnostics.emitted_mass_kg == 0


def test_profile_sweep_envelope_contains_submitted_profile_simulation():
    scenario = synthetic(
        column_height_m=1000,
        wind_profile=[
            dict(height_above_vent_m=0, speed_m_s=100, wind_from_deg=270),
            dict(height_above_vent_m=1000, speed_m_s=100, wind_from_deg=270),
        ],
    )
    from abo_api import kernel

    _, inverse = kernel.projection(scenario.vent_lat, scenario.vent_lon)
    lon, lat = inverse.transform(5000, 0)
    request = SimulationRequest(
        scenario=scenario, receptors=[Receptor(id="synthetic", name="Synthetic", lat=lat, lon=lon)]
    )
    fixed = service.simulate(request).receptors[0].load_kg_m2
    maximum = service.sweep(request).receptors[0].maximum_load_kg_m2
    assert maximum >= fixed * (1 - 1e-12), (maximum, fixed)


def test_profile_sweep_matches_independent_scalar_rotation():
    from abo_api import kernel

    scenario = synthetic(
        column_height_m=1000,
        diffusivity_m2_s=250,
        wind_from_deg=37,
        wind_profile=[
            dict(height_above_vent_m=0, speed_m_s=10, wind_from_deg=180),
            dict(height_above_vent_m=1000, speed_m_s=30, wind_from_deg=270),
        ],
    )
    _, inverse = kernel.projection(scenario.vent_lat, scenario.vent_lon)
    lon, lat = inverse.transform(2000, 3000)
    request = SimulationRequest(
        scenario=scenario, receptors=[Receptor(id="synthetic", name="Synthetic", lat=lat, lon=lon)]
    )
    row = service.sweep(request).receptors[0]
    # Independent scalar expectations, 12 source components: ground vector N10,
    # top vector E30; linear component interpolation, clockwise profile rotation.
    values = []
    for bearing in range(360):
        angle = math.radians(bearing - 37)
        total = 0
        for grain in scenario.grains:
            for layer in range(4):
                height = 1000 * (layer + 0.5) / 4
                fall = height / 10
                east_wind, north_wind = 30 * height / 1000, 10 * (1 - height / 1000)
                ue = east_wind * math.cos(angle) + north_wind * math.sin(angle)
                un = north_wind * math.cos(angle) - east_wind * math.sin(angle)
                variance = scenario.initial_spread_m**2 + 2 * scenario.diffusivity_m2_s * fall
                distance2 = (2000 - ue * fall) ** 2 + (3000 - un * fall) ** 2
                total += (
                    100000
                    * grain.fraction
                    / 4
                    / (2 * math.pi * variance)
                    * math.exp(-distance2 / (2 * variance))
                )
        values.append(total)
    assert np.isclose(row.maximum_load_kg_m2, max(values), rtol=1e-9)
    assert row.wind_from_deg == int(np.argmax(values))


def test_pulse_profile_every_frame_parcel_and_deposit_mass_close():
    scenario = synthetic(
        column_height_m=100,
        mass_rate_kg_s=150,
        pulses=[
            dict(start_s=0, duration_s=100, mass_rate_kg_s=500, column_height_m=50),
            dict(start_s=900, duration_s=100, mass_rate_kg_s=1000, column_height_m=100),
        ],
        wind_profile=[
            dict(height_above_vent_m=0, speed_m_s=1, wind_from_deg=180),
            dict(height_above_vent_m=100, speed_m_s=2, wind_from_deg=270),
        ],
    )
    sequence = eruption.sequence(
        EruptionRequest(simulation=SimulationRequest(scenario=scenario, receptors=[]))
    )
    for frame in sequence.frames:
        d = frame.diagnostics
        assert np.isclose(sum(p.mass_kg for p in frame.plume_parcels), d.airborne_mass_kg)
        assert np.isclose(d.deposited_mass_kg + d.airborne_mass_kg, d.emitted_mass_kg)
        if 100 <= frame.elapsed_s < 900:
            assert frame.column_top_m == 0


def test_visible_column_uses_current_pulse_height_and_relative_start():
    scenario = synthetic(
        column_height_m=100,
        pulses=[
            dict(start_s=0, duration_s=100, mass_rate_kg_s=500, column_height_m=50),
            dict(start_s=900, duration_s=100, mass_rate_kg_s=500, column_height_m=100),
        ],
    )
    sequence = eruption.sequence(
        EruptionRequest(simulation=SimulationRequest(scenario=scenario, receptors=[]))
    )
    for frame in sequence.frames:
        elapsed = frame.elapsed_s
        expected = max(
            [
                min(p.column_height_m, 30 * max(0, elapsed - p.start_s))
                for p in scenario.pulses
                if p.start_s <= elapsed < p.start_s + p.duration_s and p.mass_rate_kg_s > 0
            ]
            or [0]
        )
        assert np.isclose(frame.column_top_m, expected), (elapsed, frame.column_top_m, expected)


@pytest.mark.parametrize("profile", [False, True])
def test_sweep_admission_is_batched_and_preserves_unknown_coverage(profile, monkeypatch):
    from abo_api import kernel

    scenario = synthetic(wind_speed_m_s=0)
    if profile:
        data = scenario.model_dump()
        data["wind_profile"] = [
            dict(height_above_vent_m=0, speed_m_s=1, wind_from_deg=0),
            dict(height_above_vent_m=10, speed_m_s=2, wind_from_deg=90),
        ]
        scenario = Scenario.model_validate(data)
    _, inverse = kernel.projection(scenario.vent_lat, scenario.vent_lon)
    lon, lat = inverse.transform(20000, 0)
    request = SimulationRequest(
        scenario=scenario,
        receptors=[
            Receptor(
                id="vent", name="Synthetic vent", lat=scenario.vent_lat, lon=scenario.vent_lon
            ),
            Receptor(id="outside", name="Synthetic outside", lat=lat, lon=lon),
        ],
    )
    original = kernel.sweep_maxima
    evaluated = []

    def observed(*args, **kwargs):
        directions = args[-1]
        assert directions.size <= 16
        evaluated.extend(directions.tolist())
        return original(*args, **kwargs)

    monkeypatch.setattr(kernel, "sweep_maxima", observed)
    result = service.sweep(request)
    assert evaluated == list(range(360))
    assert result.receptors[1].maximum_load_kg_m2 is None
    assert result.receptors[1].wind_from_deg is None
    if not profile:
        fixed = service.simulate(request)
        assert result.receptors[0].maximum_load_kg_m2 == fixed.receptors[0].load_kg_m2
        assert result.receptors[0].wind_from_deg == 0


def test_empty_sweep_receptors_remain_empty():
    result = service.sweep(SimulationRequest(scenario=synthetic(), receptors=[]))
    assert result.receptors == []


def test_profile_vent_tie_returns_earliest_bearing():
    scenario = synthetic(
        column_height_m=1000,
        diffusivity_m2_s=250,
        wind_from_deg=37,
        wind_profile=[
            dict(height_above_vent_m=0, speed_m_s=10, wind_from_deg=37),
            dict(height_above_vent_m=1000, speed_m_s=10, wind_from_deg=37),
        ],
    )
    result = service.sweep(
        SimulationRequest(
            scenario=scenario,
            receptors=[
                Receptor(id="vent", name="Synthetic", lat=scenario.vent_lat, lon=scenario.vent_lon)
            ],
        )
    )
    assert result.receptors[0].wind_from_deg == 0


def test_short_interior_pulse_is_represented_in_sequence_snapshots():
    scenario = synthetic(
        mass_rate_kg_s=1,
        pulses=[
            dict(start_s=450, duration_s=1, mass_rate_kg_s=1000, column_height_m=10),
            dict(start_s=999, duration_s=1, mass_rate_kg_s=0, column_height_m=10),
        ],
    )
    result = eruption.sequence(
        EruptionRequest(simulation=SimulationRequest(scenario=scenario, receptors=[]))
    )
    assert any(450 < f.elapsed_s < 451 and f.column_top_m > 0 for f in result.frames)
