"""Read-only current science evidence; no external collection or historical overwrites."""

import hashlib
import importlib.metadata
import json
import platform
from collections import Counter
from pathlib import Path

from abo_api import evidence, service

ROOT = Path(__file__).resolve().parents[3]
OUTPUT = Path(__file__).resolve().parent / "scientific_state.json"
data = service.catalog()
sources = {source.id for source in data.sources}
assert len(sources) == len(data.sources)
assert len({row.id for row in data.receptors}) == len(data.receptors)
assert all(set(row.source_ids) <= sources for row in data.receptors)
assert all(set(row.source_ids) <= sources for row in data.parameter_evidence)
hash_checks = []
for relative in [
    "data/source/manifest.json",
    "data/source/gap-curation-manifest.json",
    "data/source/igra/manifest.json",
    "data/source/taal-study/manifest.json",
]:
    path = ROOT / relative
    manifest = json.loads(path.read_text(encoding="utf-8-sig"))
    entries = manifest if isinstance(manifest, list) else manifest["files"]
    if isinstance(manifest, dict):
        entries += manifest.get("derived_assets", [])
    for row in entries:
        if "sha256" not in row:
            continue
        target = path.parent / row["file"]
        actual = hashlib.sha256(target.read_bytes()).hexdigest()
        assert actual == row["sha256"], target
        hash_checks.append({"file": target.relative_to(ROOT).as_posix(), "sha256": actual})
profiles = evidence.parse_igra(
    (ROOT / "data/source/igra/tanay-2020-01-12-13.txt").read_text(encoding="utf-8")
)
wind = evidence.effective_wind([profile for profile in profiles if profile["date"] == "2020-01-12"])
assert not wind["available"]
assert all(profile["height_grid_coverage_fraction"] == 15 / 21 for profile in wind["profiles"])
historical = service.replication()
assert not historical.available and historical.simulation is None and not historical.metrics
municipal = [row for row in data.receptors if row.kind == "municipality"]
report = {
    "python": platform.python_version(),
    "packages": {
        name: importlib.metadata.version(name)
        for name in ["numpy", "scipy", "pyproj", "shapely", "pydantic", "fastapi", "pytest"]
    },
    "dataset_revision": data.revision,
    "catalog_sha256": hashlib.sha256((ROOT / "data/catalog.json").read_bytes()).hexdigest(),
    "reviewed_source_sha256": {
        relative: hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()
        for relative in [
            "backend/src/abo_api/kernel.py",
            "backend/src/abo_api/service.py",
            "backend/src/abo_api/eruption.py",
            "backend/src/abo_api/evidence.py",
            "backend/src/abo_api/contracts.py",
            "backend/src/abo_api/main.py",
            "docs/ABO_RESEARCH_IMRAD.md",
        ]
    },
    "source_and_derived_sha256_checks": hash_checks,
    "source_references_resolve": True,
    "unique_receptor_ids": True,
    "municipal_receptors": len(municipal),
    "historical_2020_known": sum(
        row.population_records.get("2020") is not None for row in municipal
    ),
    "criteria_count": len(data.criteria),
    "water_facilities_count": sum(row.kind == "water" for row in data.receptors),
    "parameter_classifications": dict(
        Counter(row.classification for row in data.parameter_evidence)
    ),
    "parameter_readiness": dict(Counter(row.readiness for row in data.parameter_evidence)),
    "tanay_wind": wind,
    "historical_available": historical.available,
    "historical_metrics": historical.metrics,
    "historical_blockers": historical.blocked_inputs,
    "historical_reference_dependency_groups": sorted(
        {row.dependency_group for row in historical.reference_footprints}
    ),
    "limit": (
        "Hashes prove retained-byte identity, not source truth or empirical prediction accuracy."
    ),
}
OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(f"Verified {len(hash_checks)} source/derived hashes and {len(data.receptors)} receptor IDs.")
