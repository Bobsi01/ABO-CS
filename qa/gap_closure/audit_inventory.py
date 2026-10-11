"""Recompute domain geometry and audit transcribed official population pairs."""

import hashlib
import json
import re
from pathlib import Path

import numpy as np
import shapely
from pyproj import CRS, Transformer

ROOT = Path(__file__).resolve().parents[2]


def load(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def normalize(value):
    value = value.casefold().split(",")[0].replace("city of ", "").replace(" city", "")
    return re.sub("[^a-z]", "", value)


def independently_parse_directory_excerpts():
    rows = {}
    for path in sorted((ROOT / "data/source/population").glob("psgc-directory-extract*.txt")):
        for line in path.read_text(encoding="utf-8").splitlines():
            cells = [cell.strip() for cell in line.split("|")]
            if len(cells) != 5 or not cells[1].isdigit() or len(cells[1]) != 10:
                continue
            if not cells[2].isdigit() or len(cells[2]) != 9:
                continue
            population = cells[4].replace(",", "")
            if not population.isdigit():
                continue
            name = cells[0].rsplit("†", 1)[-1].rstrip("\ue201 ")
            candidate = {
                "name": name,
                "code": cells[1],
                "correspondence_code": cells[2],
                "population_2024": int(population),
                "excerpt": path.name,
            }
            if cells[1] in rows:
                assert rows[cells[1]]["population_2024"] == candidate["population_2024"]
                assert rows[cells[1]]["correspondence_code"] == candidate["correspondence_code"]
            rows[cells[1]] = candidate
    return rows


def main():
    catalog = load("data/catalog.json")
    inventory = load("data/source/domain-inventory.json")
    features = load("data/source/municipal-boundaries.geojson")["features"]
    shapes = np.array([shapely.geometry.shape(f["geometry"]) for f in features], dtype=object)
    receptors = {row["id"]: row for row in catalog["receptors"]}
    assert len(receptors) == len(catalog["receptors"])
    sources = {row["id"] for row in catalog["sources"]}
    assert all(set(r["source_ids"]) <= sources for r in receptors.values())
    included = set()
    domain_checks = {}
    for volcano in catalog["volcanoes"]:
        # Independently construct the declared metric CRS; do not call ABO projection.
        crs = CRS.from_proj4(
            f"+proj=aeqd +lat_0={volcano['lat']} +lon_0={volcano['lon']} "
            "+datum=WGS84 +units=m +no_defs"
        )
        transform = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
        projected = shapely.transform(shapes, transform.transform, interleaved=False)
        indices = np.flatnonzero(
            shapely.intersects(projected, shapely.box(-100000, -100000, 100000, 100000))
        )
        expected_ids = {features[i]["properties"]["shapeID"] for i in indices}
        record = inventory["domains"][volcano["id"]]
        assert {r["shape_id"] for r in record["records"]} == expected_ids
        assert record["intersecting_administrative_polygons"] == len(expected_ids)
        assert record["included"] == sum(r["status"] == "included" for r in record["records"])
        assert record["unresolved"] == sum(r["status"] == "unresolved" for r in record["records"])
        outside_centroids = []
        for row in record["records"]:
            if row["status"] == "included":
                assert row["psgc"] in receptors
                receptor = receptors[row["psgc"]]
                east, north = transform.transform(receptor["lon"], receptor["lat"])
                if abs(east) > 100000 or abs(north) > 100000:
                    outside_centroids.append(row["psgc"])
                included.add(row["psgc"])
        domain_checks[volcano["id"]] = {
            "independently_recomputed_intersections": len(expected_ids),
            "included": record["included"],
            "unresolved": record["unresolved"],
            "included_polygon_but_outside_centroid": outside_centroids,
        }
    assert inventory["included_unique"] == len(included)
    municipalities = {code: row for code, row in receptors.items() if row["kind"] == "municipality"}
    assert (
        set(inventory["omitted_existing_outside_all_domains"]) == municipalities.keys() - included
    )
    primary = load("qa/gap_closure/batangas-primary-pairs.json")
    pairs = []
    for name, population_2020, population_2024 in primary["rows"]:
        matches = [
            r
            for code, r in municipalities.items()
            if code.startswith("04010") and normalize(r["name"]) == normalize(name)
        ]
        assert len(matches) == 1, name
        row = matches[0]
        assert row["population_records"]["2020"] == population_2020, name
        assert row["population_records"]["2024"] == population_2024, name
        pairs.append(
            {"id": row["id"], "name": name, "2020": population_2020, "2024": population_2024}
        )
    directory = independently_parse_directory_excerpts()
    curated_directory = {
        r["code"]: r for r in load("data/source/population/psgc-extracted-records.json")
    }
    assert directory.keys() == curated_directory.keys()
    for code, row in directory.items():
        assert row["population_2024"] == curated_directory[code]["population_2024"]
        assert row["correspondence_code"] == curated_directory[code]["correspondence_code"]
    prior_primary = {
        row["code"]: row["population"] for row in load("qa/primary_population.json")["rows"]
    }
    population_source_pairs = []
    for code, row in municipalities.items():
        if code in directory:
            expected = directory[code]["population_2024"]
            source = directory[code]["excerpt"]
        else:
            assert code in prior_primary, f"No independent source-pair evidence: {code}"
            expected = prior_primary[code]
            source = "qa/primary_population.json (prior official provincial-source audit)"
        assert row["population_records"]["2024"] == expected, code
        population_source_pairs.append(
            {"code": code, "population_2024": expected, "source": source}
        )
    crosswalks = []
    for code, row in municipalities.items():
        if code in directory and row.get("admin_codes", {}).get("correspondence"):
            assert row["admin_codes"]["correspondence"] == directory[code]["correspondence_code"]
            assert row["population_records"]["2024"] == directory[code]["population_2024"]
            crosswalks.append(code)
    result = {
        "dataset_revision": catalog["revision"],
        "catalog_sha256": hashlib.sha256((ROOT / "data/catalog.json").read_bytes()).hexdigest(),
        "inventory_sha256": hashlib.sha256(
            (ROOT / "data/source/domain-inventory.json").read_bytes()
        ).hexdigest(),
        "domain_checks": domain_checks,
        "included_unique": len(included),
        "municipalities_in_catalog": len(municipalities),
        "primary_2020_and_2024_pairs_checked": pairs,
        "archived_directory_crosswalks_checked": crosswalks,
        "all_current_population_source_pairs": population_source_pairs,
        "independently_parsed_archived_directory_rows": len(directory),
        "historical_population_known": sum(
            r.get("population_records", {}).get("2020") is not None for r in municipalities.values()
        ),
        "historical_population_missing": sum(
            r.get("population_records", {}).get("2020") is None for r in municipalities.values()
        ),
        "limit": (
            "Inventory arithmetic/identity and transcriptions checked; archived simplified "
            "boundaries and partial indexed directory excerpts do not establish complete "
            "current jurisdiction coverage or unchanged 2020 boundaries."
        ),
    }
    (ROOT / "qa/gap_closure/independent-inventory.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                k: v
                for k, v in result.items()
                if k
                not in (
                    "primary_2020_and_2024_pairs_checked",
                    "archived_directory_crosswalks_checked",
                    "all_current_population_source_pairs",
                )
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
