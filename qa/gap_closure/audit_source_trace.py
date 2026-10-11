"""Independently audit archived article identity, hashes and frozen contour output."""

import hashlib
import json
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
import shapely
from pyproj import CRS, Geod, Transformer

ROOT = Path(__file__).resolve().parents[2]
FOLDER = ROOT / "data/source/taal-study"
QA = ROOT / "qa/gap_closure"


def main():
    manifest = json.loads((FOLDER / "manifest.json").read_text())
    curation = json.loads((ROOT / "data/source/gap-curation-manifest.json").read_text())
    curation_hashes = []
    for record in curation["files"]:
        digest = hashlib.sha256((ROOT / "data/source" / record["file"]).read_bytes()).hexdigest()
        assert digest == record["sha256"]
        curation_hashes.append(record)
    metadata = json.loads((FOLDER / "PMC8889389.1.json").read_text())
    assert metadata["pmcid"] == "PMC8889389"
    assert metadata["doi"] == "10.1007/s00445-022-01534-y"
    assert metadata["is_pmc_openaccess"]
    assert not metadata["is_retracted"]
    hashes = []
    for record in manifest["files"]:
        blob = (FOLDER / record["file"]).read_bytes()
        sha = hashlib.sha256(blob).hexdigest()
        md5 = hashlib.md5(blob).hexdigest()
        assert sha == record["sha256"]
        assert md5 == record["md5"]
        hashes.append({"file": record["file"], "sha256": sha, "md5": md5})
    assert (FOLDER / "PMC8889389.1.pdf").read_bytes().startswith(b"%PDF")
    assert (FOLDER / "figure-4.jpg").read_bytes().startswith(b"\xff\xd8\xff")
    assert b"DOCTYPE html" in (FOLDER / "figure-4.png").read_bytes()[:100]
    assert hashes[-1]["md5"] in next(url for url in metadata["media_urls"] if "Fig4_HTML" in url)
    assert hashes[2]["md5"] in metadata["pdf_url"]
    article = ET.parse(FOLDER / "PMC8889389.1.xml").getroot()
    table = next(t for t in article.iter("table-wrap") if t.attrib["id"] == "Tab3")
    rows = [[" ".join(cell.itertext()).strip() for cell in row] for row in table.iter("tr")]
    thickness = next(row for row in rows if row and row[0] == "Thickness (cm)")
    area = next(row for row in rows if row and row[0].startswith("Area (km"))
    assert thickness[-1] == "0.05"
    assert float(area[-1]) == 3864.89
    permissions = " ".join(" ".join(p.itertext()) for p in article.iter("permissions"))
    assert "creativecommons.org/licenses/by/4.0/" in permissions
    assert "third party" in permissions

    # Reconstruct scientific output directly from the frozen controls and pixels.
    source = json.loads((FOLDER / "trace-science.json").read_text())
    controls = [np.asarray(source[key]) for key in ("longitude_controls", "latitude_controls")]
    affine = [
        np.linalg.lstsq(np.c_[points[:, 0], np.ones(len(points))], points[:, 1], rcond=None)[0]
        for points in controls
    ]
    pixels = np.asarray(source["outline_pixels"])
    coordinates = np.c_[
        pixels[:, 0] * affine[0][0] + affine[0][1], pixels[:, 1] * affine[1][0] + affine[1][1]
    ]
    expected = shapely.Polygon(coordinates)
    actual_record = json.loads((FOLDER / "trace-science.geojson").read_text())
    actual = shapely.geometry.shape(actual_record["geometry"])
    assert actual.is_valid
    coordinate_error = float(
        np.max(np.abs(shapely.get_coordinates(expected) - shapely.get_coordinates(actual)))
    )
    assert coordinate_error < 1e-9
    qa_record = json.loads((QA / "trace-qa.geojson").read_text())
    assert json.loads((FOLDER / "trace-qa.geojson").read_text()) == qa_record
    qa_geometry = shapely.geometry.shape(qa_record["geometry"])
    forward = Transformer.from_crs(
        "EPSG:4326",
        CRS.from_proj4("+proj=aeqd +lat_0=14.0106 +lon_0=120.9975 +datum=WGS84 +units=m"),
        always_xy=True,
    )
    science_m, qa_m = [
        shapely.transform(g, forward.transform, interleaved=False) for g in (expected, qa_geometry)
    ]
    geod = Geod(ellps="WGS84")
    geodesic_areas = [
        abs(geod.geometry_area_perimeter(g)[0]) / 1e6 for g in (expected, qa_geometry)
    ]
    iou = science_m.intersection(qa_m).area / science_m.union(qa_m).area
    hausdorff = float(shapely.hausdorff_distance(science_m.boundary, qa_m.boundary, densify=0.1))
    domain = shapely.box(-100000, -100000, 100000, 100000)
    clipped = [g.intersection(domain).area / 1e6 for g in (science_m, qa_m)]
    comparison = json.loads((FOLDER / "trace-comparison.json").read_text())
    assert np.allclose(geodesic_areas, comparison["geodesic_areas_km2"], atol=1e-6, rtol=0)
    assert abs(iou - comparison["intertrace_iou"]) < 1e-10
    assert abs(hausdorff - comparison["boundary_hausdorff_m"]) < 1e-5
    assert np.allclose(
        clipped, comparison["domain"]["clipped_projected_areas_km2"], atol=1e-6, rtol=0
    )
    result = {
        "checks": (
            "PASS: archived identity/hash/type, source Table 3 and license, "
            "frozen pixel output, local projection comparison"
        ),
        "source_hashes": hashes,
        "curation_manifest_hashes": curation_hashes,
        "table_3_thickness_cm": thickness[1:],
        "table_3_area_km2": area[1:],
        "narrative_table_conflict": (
            "8605 km2 narrative versus 3864.89 km2 Table 3 remains unresolved"
        ),
        "maximum_coordinate_error_deg": coordinate_error,
        "geodesic_areas_km2": geodesic_areas,
        "local_aeqd_intertrace_iou": iou,
        "local_aeqd_boundary_hausdorff_m": hausdorff,
        "clipped_projected_areas_km2": clipped,
        "source_dependency_group": "taal-deposit-study",
        "independent_observations": 0,
        "historical_validation": (
            "Not established; this audits source digitization, not model agreement"
        ),
    }
    (QA / "independent-source-trace.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
