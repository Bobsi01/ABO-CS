"""Source-integrity and readiness regressions; these do not assert empirical accuracy."""

import hashlib
import json
from pathlib import Path

import pytest
import shapely
from fastapi.testclient import TestClient

from abo_api import evidence, service
from abo_api.contracts import FootprintReference, HistoricalRecord, SimulationRequest
from abo_api.main import app

ROOT = Path(__file__).resolve().parents[2]


def read(relative):
    return json.loads((ROOT / relative).read_text(encoding="utf-8-sig"))


@pytest.mark.parametrize(
    "relative",
    [
        "data/source/manifest.json",
        "data/source/gap-curation-manifest.json",
        "data/source/igra/manifest.json",
        "data/source/taal-study/manifest.json",
    ],
)
def test_curated_source_and_derived_hashes_match_archived_bytes(relative):
    manifest = read(relative)
    entries = manifest if isinstance(manifest, list) else manifest["files"]
    if isinstance(manifest, dict):
        entries += manifest.get("derived_assets", [])
    for item in entries:
        if "sha256" in item:
            path = (ROOT / relative).parent / item["file"]
            assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"]


def test_taal_assets_are_actual_primary_formats_with_publisher_digests():
    folder = ROOT / "data/source/taal-study"
    assert (folder / "figure-4.jpg").read_bytes().startswith(b"\xff\xd8\xff")
    assert (folder / "figure-4-pdf-extract.png").read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
    assert (folder / "PMC8889389.1.pdf").read_bytes().startswith(b"%PDF")
    metadata = read("data/source/taal-study/PMC8889389.1.json")
    assert metadata["is_pmc_openaccess"] and not metadata["is_retracted"]
    assert not metadata["is_manuscript"]
    source_urls = {
        "PMC8889389.1.pdf": metadata["pdf_url"],
        "PMC8889389.1.xml": metadata["xml_url"],
        "figure-4.jpg": next(u for u in metadata["media_urls"] if "Fig4_" in u),
    }
    for name, url in source_urls.items():
        assert hashlib.md5((folder / name).read_bytes()).hexdigest() == url.split("md5=")[1]
    # A rejected HTML acquisition may not silently become an accepted image.
    manifest = read("data/source/taal-study/manifest.json")
    rejected = manifest["rejected_acquisition"]["file"]
    assert rejected not in {item["file"] for item in manifest["files"]}


def test_frozen_derived_traces_are_valid_and_remain_one_dependent_source():
    data = service.catalog()
    references = data.historical.reference_footprints
    assert len(references) == 2
    assert len({r.trace_id for r in references}) == 2
    assert {r.dependency_group for r in references} == {"taal-deposit-study"}
    for reference in references:
        geometry = shapely.geometry.shape(reference.geojson["geometry"])
        assert geometry.is_valid and geometry.geom_type == "Polygon"
        assert reference.threshold_mm == 0.5
    comparison = data.historical.footprint_evidence
    assert comparison["independent_observation_count"] == 0
    assert 0 < comparison["intertrace_iou"] < 1
    assert comparison["boundary_hausdorff_m"] > 0
    assert comparison["published_areas_km2"] == {"narrative": 8605, "table_3": 3864.89}
    assert all(0 < f < 1 for f in comparison["domain"]["outside_domain_projected_fraction"])
    assert data.historical.observations == []


def test_archived_tanay_launches_fail_frozen_height_coverage_without_extrapolation():
    raw = (ROOT / "data/source/igra/tanay-2020-01-12-13.txt").read_text()
    profiles = evidence.parse_igra(raw)
    selected = [p for p in profiles if p["date"] == "2020-01-12"]
    assert len(selected) == 2
    result = evidence.effective_wind(selected)
    assert result["available"] is False
    assert result["speed_m_s"] is None and result["from_deg"] is None
    assert all(
        p["height_grid_coverage_fraction"] == pytest.approx(15 / 21) for p in result["profiles"]
    )


def test_inventory_year_selection_does_not_substitute_current_for_missing_historical_counts():
    data = service.catalog()
    municipalities = [r for r in data.receptors if r.kind == "municipality"]
    assert len(municipalities) == 318
    assert all(r.population_records["2024"] is not None for r in municipalities)
    request = SimulationRequest(scenario=data.scenarios[0].scenario, population_year=2020)
    prepared = service.prepare(request)
    receptors = [r for r in prepared[1] if r.kind == "municipality"]
    assert sum(r.population is not None for r in receptors) == 34
    assert sum(r.population is None for r in receptors) == 284
    assert all(r.population_year == 2020 for r in receptors)


def test_domain_inventory_preserves_unresolved_exclusions_and_distinct_centroid_role():
    inventory = read("data/source/domain-inventory.json")
    unique = set()
    for domain in inventory["domains"].values():
        assert domain["intersecting_administrative_polygons"] == (
            domain["included"] + domain["unresolved"]
        )
        assert len(domain["records"]) == domain["intersecting_administrative_polygons"]
        unique.update(r["psgc"] for r in domain["records"] if r["status"] == "included")
    assert len(unique) == inventory["included_unique"] == 308
    assert len(inventory["omitted_existing_outside_all_domains"]) == 10


def test_blocked_historical_endpoint_exposes_reference_evidence_without_running_a_solver(
    monkeypatch,
):
    def forbidden(*args, **kwargs):
        pytest.fail("Source-blocked historical route must not invent a simulation")

    monkeypatch.setattr(service, "simulate", forbidden)
    response = TestClient(app).post("/api/replications/taal-2020")
    assert response.status_code == 200
    result = response.json()
    assert result["available"] is False
    assert result["simulation"] is None and result["metrics"] == {}
    assert result["protocol"]["review_status"] == "approved"
    assert len(result["reference_footprints"]) == 2
    assert result["footprint_evidence"]["independent_observation_count"] == 0
    assert result["observation_results"] == []
    assert result["blocked_inputs"] and "validated" not in result["validation_status"]


def test_unaccepted_impact_sources_are_recorded_without_numerical_damage_claims():
    data = service.catalog()
    investigations = read("data/source/source-investigations.json")
    assert len(investigations["records"]) == 6
    assert all(r["status"] == "source_blocked" for r in investigations["records"])
    assert data.criteria == []
    assert not any(r.kind == "water" for r in data.receptors)
    assert all(p.scenario.input_status == "illustrative" for p in data.scenarios)
    assert any(p.id == "water-facility-coordinates" for p in data.parameter_evidence)


def test_available_synthetic_comparison_reports_both_trace_metrics_without_certification(
    monkeypatch,
):
    data = service.catalog()
    s = data.scenarios[0].scenario.model_copy(update={"domain_km": 20, "cell_km": 1})
    polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [s.vent_lon - 0.1, s.vent_lat - 0.1],
                [s.vent_lon + 0.1, s.vent_lat - 0.1],
                [s.vent_lon + 0.1, s.vent_lat + 0.1],
                [s.vent_lon - 0.1, s.vent_lat + 0.1],
                [s.vent_lon - 0.1, s.vent_lat - 0.1],
            ]
        ],
    }
    refs = [
        FootprintReference(
            trace_id=f"synthetic-{i}",
            label="Synthetic only",
            threshold_mm=0.5,
            geojson=polygon,
            source_ids=[],
            dependency_group="synthetic",
            uncertainty_notes="No real observation evidence",
        )
        for i in (1, 2)
    ]
    data.historical = HistoricalRecord(
        available=True,
        reason="Synthetic fixture only",
        scenario=s,
        reference_footprint_geojson=polygon,
        reference_footprints=refs,
    )
    monkeypatch.setattr(service, "catalog", lambda: data)
    result = service.replication()
    assert result.available
    assert result.validation_status == "evaluated_not_validated"
    assert result.metrics["footprint_iou_trace_1"] == result.metrics["footprint_iou"]
    assert result.metrics["footprint_iou_trace_2"] == result.metrics["footprint_iou"]
    assert result.metrics["interval_rmse_mm"] is None
