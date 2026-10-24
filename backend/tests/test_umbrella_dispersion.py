"""Numerical tests for radial umbrella cloud dispersion and wind shear coupling."""

import numpy as np

from abo_api import kernel
from abo_api.contracts import Grain, Scenario, SimulationRequest, WindLevel
from abo_api.service import simulate


def test_umbrella_exact_mass_conservation():
    """Verify that umbrella cloud radial expansion preserves 100% mass conservation."""
    height = 17000.0
    mass = 5.4e10
    fractions = np.array([0.1, 0.2, 0.3, 0.25, 0.15])
    settling = np.array([5.0, 2.5, 1.0, 0.3, 0.05])
    layers = 16
    diffusivity = 1000.0
    initial_spread = 500.0
    umbrella_radius = 20000.0

    times, weights, variance = kernel.components(
        height,
        mass,
        fractions,
        settling,
        layers,
        diffusivity,
        initial_spread,
        umbrella_radius=umbrella_radius,
    )

    assert math_close(np.sum(weights), mass)

    # Grid integration on a large 400 km domain with calm wind to capture all mass
    domain_m = 400000.0
    cell_m = 2000.0
    _, _, inside_mass = kernel.grid_load(domain_m, cell_m, times, weights, variance, 0.0, 0.0)
    # Total mass retained on infinite plane is exactly mass; inside 400 km domain is >99.9%
    assert inside_mass / mass > 0.999


def test_umbrella_backward_compatibility():
    """When umbrella_radius is None or less than initial_spread, variance must match baseline."""
    height = 10000.0
    mass = 1e8
    fractions = np.array([0.2, 0.5, 0.3])
    settling = np.array([2.0, 1.0, 0.5])
    layers = 8
    diffusivity = 500.0
    initial_spread = 250.0

    times_base, weights_base, var_base = kernel.components(
        height, mass, fractions, settling, layers, diffusivity, initial_spread, umbrella_radius=None
    )
    times_umb, weights_umb, var_umb = kernel.components(
        height,
        mass,
        fractions,
        settling,
        layers,
        diffusivity,
        initial_spread,
        umbrella_radius=200.0,
    )

    np.testing.assert_allclose(times_base, times_umb)
    np.testing.assert_allclose(weights_base, weights_umb)
    np.testing.assert_allclose(var_base, var_umb)


def test_umbrella_calm_wind_radial_dispersion():
    """Verify radial dispersion under calm/light wind spreads tephra to caldera rim."""
    grains = [
        Grain(diameter_um=4000.0, fraction=0.10, settling_speed_m_s=8.0),
        Grain(diameter_um=1000.0, fraction=0.20, settling_speed_m_s=3.5),
        Grain(diameter_um=250.0, fraction=0.30, settling_speed_m_s=1.2),
        Grain(diameter_um=90.0, fraction=0.25, settling_speed_m_s=0.35),
        Grain(diameter_um=31.0, fraction=0.15, settling_speed_m_s=0.08),
    ]

    scenario_base = Scenario(
        volcano_id="taal",
        vent_lat=14.002,
        vent_lon=120.993,
        vent_elevation_m=311.0,
        column_height_m=17000.0,
        mass_rate_kg_s=1.5e6,
        duration_s=36000.0,
        wind_speed_m_s=0.0,
        wind_from_deg=0.0,
        diffusivity_m2_s=1000.0,
        initial_spread_m=500.0,
        bulk_density_kg_m3=1000.0,
        grains=grains,
        domain_km=300.0,
        cell_km=2.0,
        umbrella_radius_m=None,
    )

    scenario_umbrella = scenario_base.model_copy(update={"umbrella_radius_m": 20000.0})

    result_base = simulate(SimulationRequest(scenario=scenario_base))
    result_umb = simulate(SimulationRequest(scenario=scenario_umbrella))

    receptors_base = {r.name.split(",")[0].strip(): r for r in result_base.receptors}
    receptors_umb = {r.name.split(",")[0].strip(): r for r in result_umb.receptors}

    # At 10-15 km from vent, umbrella expansion broadens deposition significantly
    for name in ["Talisay", "Laurel", "San Nicolas", "Agoncillo", "Balete"]:
        r_base = receptors_base.get(name)
        r_umb = receptors_umb.get(name)
        assert r_base is not None and r_umb is not None
        assert (r_umb.thickness_mm or 0) > 1.0


def test_wind_profile_with_umbrella():
    """Verify coupling of multi-tier wind shear profile with radial umbrella cloud."""
    grains = [
        Grain(diameter_um=4000.0, fraction=0.10, settling_speed_m_s=8.0),
        Grain(diameter_um=1000.0, fraction=0.20, settling_speed_m_s=3.5),
        Grain(diameter_um=250.0, fraction=0.30, settling_speed_m_s=1.2),
        Grain(diameter_um=90.0, fraction=0.25, settling_speed_m_s=0.35),
        Grain(diameter_um=31.0, fraction=0.15, settling_speed_m_s=0.08),
    ]

    # NOAA IGRA Tanay sounding wind levels
    wind_profile = [
        WindLevel(height_above_vent_m=0.0, speed_m_s=8.0, wind_from_deg=65.0),
        WindLevel(height_above_vent_m=3000.0, speed_m_s=5.0, wind_from_deg=90.0),
        WindLevel(height_above_vent_m=6000.0, speed_m_s=6.0, wind_from_deg=145.0),
        WindLevel(height_above_vent_m=10000.0, speed_m_s=14.0, wind_from_deg=195.0),
        WindLevel(height_above_vent_m=16600.0, speed_m_s=22.0, wind_from_deg=215.0),
    ]

    scenario = Scenario(
        volcano_id="taal",
        vent_lat=14.002,
        vent_lon=120.993,
        vent_elevation_m=311.0,
        column_height_m=17000.0,
        mass_rate_kg_s=1.5e6,
        duration_s=36000.0,
        wind_speed_m_s=12.0,
        wind_from_deg=225.0,
        diffusivity_m2_s=1000.0,
        initial_spread_m=500.0,
        bulk_density_kg_m3=1000.0,
        grains=grains,
        domain_km=300.0,
        cell_km=2.0,
        wind_profile=wind_profile,
        umbrella_radius_m=20000.0,
    )

    result = simulate(SimulationRequest(scenario=scenario))
    assert result.diagnostics.inside_domain_mass_kg > 0

    receptors = {r.name.split(",")[0].strip(): r for r in result.receptors}

    # All 360° caldera rim towns around Lake Taal are affected (> 5 mm)
    assert (receptors["Talisay"].thickness_mm or 0) > 10.0
    assert (receptors["Laurel"].thickness_mm or 0) > 10.0
    assert (receptors["San Nicolas"].thickness_mm or 0) > 10.0
    assert (receptors["Agoncillo"].thickness_mm or 0) > 10.0
    assert (receptors["Tagaytay"].thickness_mm or 0) > 10.0
    assert (receptors["Balete"].thickness_mm or 0) > 10.0
    assert (receptors["Mataasnakahoy"].thickness_mm or 0) > 10.0
    assert (receptors["Cuenca"].thickness_mm or 0) > 5.0
    assert (receptors["Tanauan"].thickness_mm or 0) > 5.0

    # Distal urban centers in NCR and Bulacan are also affected
    assert (receptors["City of Muntinlupa"].thickness_mm or 0) > 0.5
    assert (receptors["City of San Jose Del Monte"].thickness_mm or 0) > 0.5
    assert (receptors["City of Makati"].thickness_mm or 0) > 0.2


def test_regional_contours_are_finite_and_within_the_computed_domain():
    """Geometry validity is a numerical check, not a prescribed coastline or shape."""
    from abo_api.service import catalog

    scenario = next(s.scenario for s in catalog().scenarios if s.id == "taal-regional")
    result = simulate(SimulationRequest(scenario=scenario))
    forward, _ = kernel.projection(scenario.vent_lat, scenario.vent_lon)
    assert result.contours.features
    for feature in result.contours.features:
        coordinates = np.asarray(feature["geometry"]["coordinates"])
        assert np.isfinite(coordinates).all()
        east, north = forward.transform(coordinates[:, 0], coordinates[:, 1])
        assert np.max(np.abs(east)) <= scenario.domain_km * 500 + 1
        assert np.max(np.abs(north)) <= scenario.domain_km * 500 + 1
        assert feature["properties"]["thickness_mm"] > 0


def math_close(a, b, tol=1e-6):
    return abs(a - b) <= tol * max(abs(a), abs(b))
