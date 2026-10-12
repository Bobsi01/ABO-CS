"""Reproduce curated gap evidence from archived public sources, never app-time fetch."""

import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np
import shapely
from pyproj import Geod

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend/src"))
from abo_api import evidence, kernel  # noqa: E402


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def psgc_extract():
    """Explicit downloaded page extracts; links and original line locators remain archived."""
    records = {}
    for path in sorted((ROOT / "data/source/population").glob("psgc-directory-extract*.txt")):
        for line in path.read_text(encoding="utf-8").splitlines():
            match = re.search(
                r"L(\d+):.*?\u2020([^\u2020\ue201]+)\ue201\s*\|\s*(\d{10})"
                r"\s*\|\s*(\d{9})\s*\|[^|]*\|\s*([\d,]+)",
                line,
            )
            if match:
                records[match[3]] = dict(
                    name=match[2],
                    code=match[3],
                    correspondence_code=match[4],
                    population_2024=int(match[5].replace(",", "")),
                    locator=f"{path.name}: directory line {match[1]}",
                )
    write_json(ROOT / "data/source/population/psgc-extracted-records.json", list(records.values()))
    return records


def normalize(name):
    name = re.sub(r"\(.*?\)", "", name.casefold())
    name = name.replace("city of ", "").replace(" city", "")
    return re.sub(r"[^a-z]", "", name)


def inventory(catalog, records):
    """Audit every archived administrative polygon against the fixed projected domains."""
    features = json.loads(
        (ROOT / "data/source/municipal-boundaries.geojson").read_text(encoding="utf-8")
    )["features"]
    centroids = json.loads(
        (ROOT / "data/source/derived-municipal-centroids.json").read_text(encoding="utf-8")
    )
    centroid_by_id = {r["properties"]["shapeID"]: r for r in centroids}
    existing = {r["id"]: r for r in catalog["receptors"] if r["kind"] == "municipality"}
    known_by_name = {}
    for r in catalog["receptors"]:
        if r["kind"] == "municipality":
            known_by_name.setdefault(normalize(r["name"].split(",")[0]), []).append(r)
    source_by_name = {}
    for row in records.values():
        source_by_name.setdefault(normalize(row["name"]), []).append(row)
    aliases = {"donsalvadorbenedicto": "salvadorbenedicto"}
    geometries = np.asarray([shapely.geometry.shape(f["geometry"]) for f in features], dtype=object)
    national_name_counts = {}
    for feature in features:
        key = normalize(feature["properties"]["shapeName"])
        national_name_counts[key] = national_name_counts.get(key, 0) + 1
    intersection_ids, domain_records = set(), {}
    geod = Geod(ellps="WGS84")
    for volcano in catalog["volcanoes"]:
        forward, _ = kernel.projection(volcano["lat"], volcano["lon"])
        projected = shapely.transform(geometries, forward.transform, interleaved=False)
        intersects = shapely.intersects(projected, shapely.box(-100000, -100000, 100000, 100000))
        selected = np.flatnonzero(intersects)
        rows = []
        for index in selected:
            feature = features[index]
            prop = feature["properties"]
            center = centroid_by_id.get(prop["shapeID"])
            key = normalize(prop["shapeName"])
            key = aliases.get(key, key)
            known = known_by_name.get(key, [])
            if center:
                known = [
                    r
                    for r in known
                    if geod.inv(center["lon"], center["lat"], r["lon"], r["lat"])[2] < 1000
                ]
            candidates = source_by_name.get(key, [])
            # Repeated names require province-specific review; never choose the nearest name alone.
            row = records.get(known[0]["id"]) if len(known) == 1 else None
            if row is None and len(known) == 1:
                row = dict(
                    name=known[0]["name"],
                    code=known[0]["id"],
                    population_2024=known[0]["population"],
                    correspondence_code=None,
                )
            if (
                row is None
                and len(candidates) == 1
                and national_name_counts.get(key) == 1
                and center
            ):
                row = candidates[0]
            if row is not None and center:
                code = row["code"]
                if code not in existing:
                    existing[code] = dict(
                        id=code,
                        name=row["name"],
                        kind="municipality",
                        lat=center["lat"],
                        lon=center["lon"],
                        population=row["population_2024"],
                        population_year=2024,
                        source_ids=["psa-national-directory", "boundaries"],
                        coordinate_role="2020 ADM3 simplified polygon equal-area centroid",
                    )
                receptor = existing[code]
                receptor["population_records"] = {"2020": None, "2024": row["population_2024"]}
                receptor["admin_codes"] = {"current": code}
                if row["correspondence_code"]:
                    receptor["admin_codes"]["correspondence"] = row["correspondence_code"]
                if code in records:
                    receptor["source_ids"] = sorted(
                        set(receptor["source_ids"] + ["psa-national-directory"])
                    )
                rows.append(
                    dict(
                        shape_id=prop["shapeID"],
                        name=prop["shapeName"],
                        psgc=code,
                        status="included",
                    )
                )
                intersection_ids.add(code)
            else:
                rows.append(
                    dict(
                        shape_id=prop["shapeID"],
                        name=prop["shapeName"],
                        status="unresolved",
                        reason="No unique reviewed name-to-PSGC match in archived extracts",
                        candidate_codes=[r["code"] for r in candidates],
                    )
                )
        domain_records[volcano["id"]] = dict(
            intersecting_administrative_polygons=len(rows),
            included=sum(r["status"] == "included" for r in rows),
            unresolved=sum(r["status"] == "unresolved" for r in rows),
            records=rows,
        )
    # Existing known receptors stay available even when their polygons do not intersect a domain.
    for receptor in existing.values():
        receptor.setdefault("population_records", {"2020": None, "2024": receptor["population"]})
        receptor.setdefault("admin_codes", {"current": receptor["id"]})
    catalog["receptors"] = list(existing.values()) + [
        r for r in catalog["receptors"] if r["kind"] != "municipality"
    ]
    coverage = dict(
        revision="domain-inventory-v1",
        geometry_source="boundaries",
        boundary_year=2020,
        domain_width_km=200,
        inclusion_rule="Administrative polygon intersects fixed vent-centered square",
        domains=domain_records,
        included_unique=len(intersection_ids),
        omitted_existing_outside_all_domains=[
            code for code in existing if code not in intersection_ids
        ],
        limitations=[
            "Simplified boundaries and centroid screening; not population polygon exposure",
            "Current correspondence codes do not prove unchanged 2020 boundaries",
            "Repeated names and missing directory rows remain unresolved and excluded",
            "Water-facility inventory and full national census acquisition remain source blocked",
        ],
    )
    write_json(ROOT / "data/source/domain-inventory.json", coverage)
    # Avoid sending hundreds of audit-only rows with every API catalog response.
    catalog["inventory_coverage"] = {
        **{k: v for k, v in coverage.items() if k != "domains"},
        "domains": {
            k: {a: b for a, b in v.items() if a != "records"} for k, v in domain_records.items()
        },
        "manifest_path": "data/source/domain-inventory.json",
    }


def archive_wind():
    path = ROOT / "data/source/igra/tanay-2020-01-12-13.txt"
    profiles = evidence.parse_igra(path.read_text(encoding="utf-8"))
    selected = [
        p for p in profiles if p["date"] == "2020-01-12" and p["nominal_hour_utc"] in (0, 12)
    ]
    wind = evidence.effective_wind(selected)
    wind["protocol_id"] = "taal-main-plume-2020-v1"
    wind["altitude_context"] = "1000–21000 geopotential metres ASL; 1000 m grid; no extrapolation"
    wind["averaging_period"] = (
        "Selected January 12 nominal 00/12 UTC launches; actual 00:11/11:40 UTC"
    )
    wind["station_distance_from_taal_km"] = (
        Geod(ellps="WGS84").inv(120.9975, 14.0106, 121.3693, 14.5812)[2] / 1000
    )
    wind["representativeness"] = "Regional proxy; limited height coverage and changing event winds"
    write_json(ROOT / "data/source/igra/tanay-effective-wind.json", wind)
    entries = []
    for name, url in (
        (
            "igra2-data-format.txt",
            "https://www.ncei.noaa.gov/pub/data/igra/data/igra2-data-format.txt",
        ),
        (
            "igra2-station-list.txt",
            "https://www.ncei.noaa.gov/pub/data/igra/igra2-station-list.txt",
        ),
        (
            "RPM00098433-data.txt.zip",
            "https://www.ncei.noaa.gov/pub/data/igra/data/data-por/RPM00098433-data.txt.zip",
        ),
        ("tanay-2020-01-12-13.txt", "derived: selected records from archived station ZIP"),
        (
            "tanay-effective-wind.json",
            "derived: frozen protocol processing; no usable effective wind",
        ),
    ):
        file = ROOT / "data/source/igra" / name
        entries.append(
            dict(file=name, url=url, sha256=hashlib.sha256(file.read_bytes()).hexdigest())
        )
    write_json(
        ROOT / "data/source/igra/manifest.json",
        dict(
            publisher="NOAA National Centers for Environmental Information",
            accessed_at="2026-10-11",
            license=(
                "Public NOAA US-government archive; Philippines upstream station-provider "
                "terms not independently verified"
            ),
            source_station_provider="Philippines; NCDC GTS pressure-level source",
            protocol_id="taal-main-plume-2020-v1",
            files=entries,
        ),
    )
    return wind


def reference_footprints():
    """Accepted double digitization is derived evidence, not raw measurement points."""
    folder = ROOT / "data/source/taal-study"
    comparison = json.loads((folder / "trace-comparison.json").read_text(encoding="utf-8"))
    references = []
    for filename, label in (
        ("trace-science.geojson", "Science trace of published 0.5 mm contour"),
        ("trace-qa.geojson", "Independent QA trace of published 0.5 mm contour"),
    ):
        feature = json.loads((folder / filename).read_text(encoding="utf-8"))
        geometry = shapely.geometry.shape(feature["geometry"])
        if not geometry.is_valid or geometry.geom_type != "Polygon":
            raise ValueError(f"Invalid reference geometry: {filename}")
        references.append(
            dict(
                trace_id=feature["properties"]["trace_id"],
                label=label,
                threshold_mm=0.5,
                geojson=feature,
                source_ids=["taal-study"],
                dependency_group="taal-deposit-study",
                uncertainty_notes=comparison["uncertainty"],
            )
        )
    return references, comparison


def write_curation_manifest():
    entries = []
    names = [
        "gap-evidence-register.json",
        "source-investigations.json",
        "domain-inventory.json",
        "population/psgc-directory-extract.txt",
        "population/psgc-directory-extract-2.txt",
        "population/psgc-directory-extract-3.txt",
        "population/psgc-extracted-records.json",
        "population/batangas-2020-transcription.json",
    ]
    for name in names:
        file = ROOT / "data/source" / name
        entries.append(dict(file=name, sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
    write_json(
        ROOT / "data/source/gap-curation-manifest.json",
        dict(
            revision="2026-10-12-gap-evidence-v2-utf8",
            accessed_at="2026-10-11",
            files=entries,
            upstream_manifests=["manifest.json", "igra/manifest.json", "taal-study/manifest.json"],
            source_locations={
                "population/psgc-directory-extract*.txt": [
                    "https://psa.gov.ph/classification/psgc/municipalities",
                    "https://psa.gov.ph/classification/psgc/cities",
                ],
                "population/batangas-2020-transcription.json": "https://rsso04a.psa.gov.ph/sites/default/files/infographics/26R0410-QS-005.pdf",
            },
            limitations=[
                "PSA directory files are retrieved text extracts with source line locators; "
                "not original HTML",
                "Batangas 2020 values were manually transcribed from the primary PDF page 2 table",
                "Original national census downloads and Batangas PDF direct acquisition "
                "returned access challenges",
                "A current correspondence code does not establish unchanged historical boundaries",
            ],
        ),
    )


def enrich_catalog(catalog):
    records = psgc_extract()
    inventory(catalog, records)
    wind = archive_wind()
    additions = json.loads(
        (ROOT / "data/source/gap-evidence-register.json").read_text(encoding="utf-8")
    )
    catalog["sources"] = list(
        {r["id"]: r for r in catalog["sources"] + additions["sources"]}.values()
    )
    catalog["parameter_evidence"] = additions["parameters"]
    catalog["historical"].update(additions["historical"])
    references, footprint_evidence = reference_footprints()
    catalog["historical"]["reference_footprints"] = references
    catalog["historical"]["reference_footprint_geojson"] = references[0]["geojson"]
    catalog["historical"]["footprint_evidence"] = footprint_evidence
    catalog["historical"]["assessment_reasons"].append(
        "Both target Tanay launches cover 15/21 height-grid levels (71.43%); 75% gate failed"
    )
    catalog["winds"] = [w for w in catalog["winds"] if w["id"] != "taal-2020-igra"]
    catalog["winds"].append(
        dict(
            id="taal-2020-igra",
            name="Taal 2020 Tanay sounding proxy",
            status="source_blocked",
            speed_m_s=None,
            from_deg=None,
            source_ids=["noaa-igra"],
            altitude_context=wind["altitude_context"],
            averaging_period=wind["averaging_period"],
            coverage_fraction=15 / 21,
            reason=wind["reason"],
        )
    )
    population = json.loads(
        (ROOT / "data/source/population/batangas-2020-transcription.json").read_text(
            encoding="utf-8"
        )
    )
    for receptor in catalog["receptors"]:
        if receptor["id"] in population["values"]:
            receptor["population_records"]["2020"] = population["values"][receptor["id"]]
            receptor["source_ids"] = sorted(
                set(receptor["source_ids"] + ["psa-batangas-quickstat"])
            )
    catalog["screening_contexts"] = additions["screening_contexts"]
    catalog["revision"] = "2026-10-12-gap-evidence-v2-utf8"
    catalog["coverage_notes"] = (
        f"{sum(r['kind'] == 'municipality' for r in catalog['receptors'])} municipalities/cities "
        "with explicit domain inventory and unresolved exclusions; 34 Batangas 2020 census counts. "
        "2020 populations remain unavailable elsewhere. "
        "Surface screens are not safety determinations."
    )
    write_curation_manifest()
    return catalog


if __name__ == "__main__":
    catalog_path = ROOT / "data/catalog.json"
    value = enrich_catalog(json.loads(catalog_path.read_text(encoding="utf-8-sig")))
    write_json(catalog_path, value)
    print(
        f"Curated {len(value['receptors'])} receptors; historical evaluation remains source blocked"
    )
