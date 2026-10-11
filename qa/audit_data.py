"""Local integrity and independent population/centroid crosschecks.

QA source facts were independently read from official PSA pages on 2026-10-09.
This script reads local snapshots only, with no scientific runtime data API.
"""

import hashlib
import json
from collections import Counter
from pathlib import Path

import numpy as np
import shapely
from pyproj import Transformer


def main():
    root = Path(__file__).resolve().parents[1]
    catalog = json.loads((root / "data/catalog.json").read_text(encoding="utf-8"))
    references = json.loads((root / "qa/primary_population.json").read_text(encoding="utf-8"))
    populations = {row["code"]: row["population"] for row in references["rows"]}
    municipalities = [r for r in catalog["receptors"] if r["kind"] == "municipality"]
    sources = {row["id"] for row in catalog["sources"]}
    assert len({r["id"] for r in catalog["receptors"]}) == len(catalog["receptors"])
    for receptor in catalog["receptors"]:
        assert set(receptor["source_ids"]) <= sources
    for receptor in municipalities:
        assert receptor["population_year"] == 2024
        assert populations[receptor["id"]] == receptor["population"], receptor

    manifest = json.loads((root / "data/source/manifest.json").read_text())
    hash_checks = []
    for row in manifest:
        if "sha256" not in row:
            continue
        actual = hashlib.sha256((root / "data/source" / row["file"]).read_bytes()).hexdigest()
        assert actual == row["sha256"], row["file"]
        hash_checks.append(row["file"])

    # Root's precomputed coordinates identify source polygons; recompute selected
    # equal-area centroids independently using the archived polygon geometries.
    derived = json.loads((root / "data/source/derived-municipal-centroids.json").read_text())
    index_by_position = {(r["lat"], r["lon"]): i for i, r in enumerate(derived)}
    positions = [index_by_position[(r["lat"], r["lon"])] for r in municipalities]
    boundary = json.loads((root / "data/source/municipal-boundaries.geojson").read_text())
    geometries = np.asarray(
        [shapely.from_geojson(json.dumps(boundary["features"][i]["geometry"])) for i in positions]
    )
    forward = Transformer.from_crs("EPSG:4326", "EPSG:6933", always_xy=True)
    inverse = Transformer.from_crs("EPSG:6933", "EPSG:4326", always_xy=True)
    projected = shapely.transform(geometries, forward.transform, interleaved=False)
    centroid = shapely.centroid(projected)
    lon, lat = inverse.transform(shapely.get_x(centroid), shapely.get_y(centroid))
    expected_lon = np.asarray([r["lon"] for r in municipalities])
    expected_lat = np.asarray([r["lat"] for r in municipalities])
    assert np.all(np.abs(lon - expected_lon) <= 0.0000005)
    assert np.all(np.abs(lat - expected_lat) <= 0.0000005)
    print(
        json.dumps(
            {
                "revision": catalog["revision"],
                "population_code_pairs_checked": len(municipalities),
                "psa_primary_pairs_available": len(populations),
                "source_references_resolve": True,
                "unique_receptor_identifiers": True,
                "source_snapshot_hashes_checked": hash_checks,
                "recomputed_equal_area_centroids": len(positions),
                "max_centroid_rounding_difference_deg": float(
                    max(np.max(np.abs(lon - expected_lon)), np.max(np.abs(lat - expected_lat)))
                ),
                "coverage_by_province": dict(
                    Counter(r["name"].split(", ")[-1] for r in municipalities)
                ),
                "unmatched_transcriptions": catalog.get("unmatched_transcriptions", []),
                "limit": (
                    "Coordinate arithmetic and population transcription checked; "
                    "name-to-polygon jurisdiction joins require separate audit. "
                    "Partial coverage is not a full regional inventory."
                ),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
