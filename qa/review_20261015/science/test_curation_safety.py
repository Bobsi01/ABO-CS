"""Independent offline curation reproduction and provenance safety regressions."""

import hashlib
import importlib.util
import json
import shutil
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "data/source/taal"


def curation_module():
    spec = importlib.util.spec_from_file_location(
        "science_review_curation", ROOT / "scripts/curate_taal_context.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_missing_seismic_source_fails_without_inventing_events(tmp_path, monkeypatch):
    module = curation_module()
    monkeypatch.setattr(module, "OUT_DIR", tmp_path)
    with pytest.raises(FileNotFoundError, match="no synthetic"):
        module.curate_earthquakes()
    assert list(tmp_path.iterdir()) == []


def test_offline_rebuild_matches_every_archived_and_public_asset(tmp_path, monkeypatch):
    module = curation_module()
    out, public = tmp_path / "source", tmp_path / "public"
    out.mkdir()
    public.mkdir()
    shutil.copy2(SOURCE / "taal_earthquakes_2021_2024.csv", out)
    monkeypatch.setattr(module, "OUT_DIR", out)
    monkeypatch.setattr(module, "FRONTEND_PUBLIC", public)
    module.main()
    for rebuilt in out.iterdir():
        assert rebuilt.read_bytes() == (SOURCE / rebuilt.name).read_bytes(), rebuilt.name
    for rebuilt in public.iterdir():
        assert rebuilt.read_bytes() == (ROOT / "frontend/public" / rebuilt.name).read_bytes()
    manifest = json.loads((out / "manifest.json").read_text())
    for entry in manifest["files"]:
        raw = (out / entry["file"]).read_bytes()
        assert len(raw) == entry["bytes"]
        assert hashlib.sha256(raw).hexdigest() == entry["sha256"]


def test_unverified_satellite_observation_is_withheld():
    observation = json.loads((SOURCE / "taal_tropomi_july2021.json").read_text())
    assert observation["review_status"] == "source_blocked"
    for field in ("plume_from_bearing_deg", "plume_length_km", "peak_so2_du"):
        assert observation[field] is None


@pytest.mark.parametrize(
    "filename",
    [
        "taal_activity_log.json",
        "taal_activity_log_2021_2024.json",
        "taal_eruption_timeline_2021_2024.json",
        "taal_wovodat_metadata.json",
        "taal_hdx_damage_proxy_metadata.json",
    ],
)
def test_unreviewed_metadata_never_claims_reviewed_observations(filename):
    content = json.loads((SOURCE / filename).read_text())
    for entry in content if isinstance(content, list) else [content]:
        assert entry["review_status"] == "source_blocked"
        assert entry["review_reason"]


def test_deformation_geometry_traces_exact_primary_artifact():
    data = json.loads((SOURCE / "taal_deformation_bato2021.json").read_text())
    archived = Path(__file__).parent / "bato2021-primary.pdf"
    assert hashlib.sha256(archived.read_bytes()).hexdigest() == data["source_sha256"]
    assert data["dike_length_km"] == 21 and data["dike_width_km"] == 8
    assert "Page 8" in data["source_locator"]
    assert "schematic" in data["azimuth_status"]
    assert data["max_uplift_cm"] is None and data["subsidence_continues_to"] is None


def test_shoreline_does_not_claim_official_hazard_geometry():
    data = json.loads((SOURCE / "taal_pdz.geojson").read_text())
    metadata = data["features"][0]["properties"]
    assert "OpenStreetMap" in metadata["authority"]
    assert metadata["review_status"] == "approximate_context"
    assert "ODbL" in metadata["geometry_source"]
