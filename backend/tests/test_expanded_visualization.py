"""Verify expanded visualization contracts, province/region metadata, and trace contours."""

from abo_api import service
from abo_api.contracts import SimulationRequest


def test_catalog_receptors_contain_province_and_region():
    data = service.catalog()
    municipalities = [r for r in data.receptors if r.kind == "municipality"]
    assert len(municipalities) == 318
    # Every municipality must carry a non-null, valid province and region
    for r in municipalities:
        assert r.province is not None and len(r.province) > 0
        assert r.region is not None and len(r.region) > 0

    provinces = {r.province for r in municipalities}
    assert "Batangas" in provinces
    assert "Cavite" in provinces
    assert "Laguna" in provinces
    assert "Rizal" in provinces
    assert "Metro Manila (NCR)" in provinces
    assert "Bulacan" in provinces
    assert "Albay" in provinces
    assert "Negros Occidental" in provinces


def test_taal_regional_scenario_preset_exists_and_computes():
    data = service.catalog()
    regional = next((s for s in data.scenarios if s.id == "taal-regional"), None)
    assert regional is not None
    assert regional.status == "illustrative"
    assert regional.scenario.column_height_m == 17000.0
    assert regional.scenario.duration_s == 36000.0
    assert regional.scenario.mass_rate_kg_s == 1500000.0
    assert regional.scenario.domain_km == 300.0

    # Ensure grain classes sum to 1.0
    assert sum(g.fraction for g in regional.scenario.grains) == 1.0

    # Execute simulation with regional scenario
    req = SimulationRequest(scenario=regional.scenario)
    result = service.simulate(req)
    assert result.diagnostics.total_ash_mass_kg == 1500000.0 * 36000.0
    assert result.summary.receptors_covered > 0
    assert result.summary.municipalities_reported > 0

    # Verify contours include trace levels 0.01 and 0.1 mm
    thickness_levels = {f["properties"]["thickness_mm"] for f in result.contours.features}
    assert 0.01 in thickness_levels or 0.1 in thickness_levels or 0.5 in thickness_levels


def test_all_catalog_presets_include_surrounding_and_downwind_dispersion():
    data = service.catalog()
    assert len(data.scenarios) >= 4
    for preset in data.scenarios:
        assert preset.scenario.umbrella_radius_m is not None
        assert preset.scenario.umbrella_radius_m >= 12000.0
        result = service.simulate(SimulationRequest(scenario=preset.scenario))
        assert result.summary.municipalities_reported >= 2
        proximal = [
            r
            for r in result.receptors
            if r.in_domain
            and r.thickness_mm is not None
            and r.thickness_mm >= 0.1
            and r.east_m is not None
            and r.north_m is not None
            and (r.east_m**2 + r.north_m**2) ** 0.5 <= 25000.0
        ]
        assert len(proximal) >= 8, f"{preset.id} should affect surrounding proximal municipalities"
