"""Georeference independently hand-traced source figure; never fit to a target area."""

import hashlib
import json
from pathlib import Path

import numpy as np
import shapely
from pyproj import CRS, Geod, Transformer

ROOT = Path(__file__).resolve().parents[1]


def compare_traces(first, second):
    """Compare complete traces independently of any eruption/model agreement."""
    a = shapely.geometry.shape(first["geometry"])
    b = shapely.geometry.shape(second["geometry"])
    local = CRS.from_proj4("+proj=aeqd +lat_0=14.0106 +lon_0=120.9975 +datum=WGS84 +units=m")
    forward = Transformer.from_crs("EPSG:4326", local, always_xy=True)
    a_m = shapely.transform(a, forward.transform, interleaved=False)
    b_m = shapely.transform(b, forward.transform, interleaved=False)
    geod = Geod(ellps="WGS84")

    def area(geometry):
        return abs(geod.geometry_area_perimeter(geometry)[0]) / 1e6

    domain = shapely.box(-100000, -100000, 100000, 100000)
    first_area, second_area = area(a), area(b)
    intersection = a_m.intersection(b_m).area
    union = a_m.union(b_m).area
    return {
        "dataset_id": "taal-figure4-derived-0.5mm-v1",
        "source_group": "taal-deposit-study",
        "independent_observation_count": 0,
        "comparison_type": "Independent manual digitization repeatability, not model agreement",
        "trace_ids": [first["properties"]["trace_id"], second["properties"]["trace_id"]],
        "geodesic_areas_km2": [first_area, second_area],
        "absolute_area_difference_km2": abs(first_area - second_area),
        "relative_area_difference_fraction": abs(first_area - second_area)
        / ((first_area + second_area) / 2),
        "intertrace_iou": intersection / union,
        "boundary_hausdorff_m": float(
            shapely.hausdorff_distance(a_m.boundary, b_m.boundary, densify=0.1)
        ),
        "symmetric_difference_area_km2": a_m.symmetric_difference(b_m).area / 1e6,
        "domain": {
            "width_km": 200,
            "vent_lat": 14.0106,
            "vent_lon": 120.9975,
            "projection": "Vent-centered WGS84 azimuthal equidistant",
            "clipped_projected_areas_km2": [
                a_m.intersection(domain).area / 1e6,
                b_m.intersection(domain).area / 1e6,
            ],
            "outside_domain_projected_fraction": [
                1 - a_m.intersection(domain).area / a_m.area,
                1 - b_m.intersection(domain).area / b_m.area,
            ],
        },
        "published_areas_km2": {"narrative": 8605, "table_3": 3864.89},
        "area_assessment": (
            "Both traces depict the printed outer contour; neither was adjusted to either "
            "published area. Published definitions remain unresolved."
        ),
        "uncertainty": (
            "Control-point residuals and intertrace disagreement quantify digitization only. "
            "Original interpolation, datum, crowdsourcing, erosion and event-window uncertainty "
            "are additional and unquantified."
        ),
        "historical_validation": (
            "Not established; independent physical inputs and effective wind remain source blocked"
        ),
    }


def georeference(trace):
    """Reproduce the frozen science trace and its control residuals."""
    x, lon = np.asarray(trace["longitude_controls"]).T
    y, lat = np.asarray(trace["latitude_controls"]).T
    x_coeff = np.polyfit(x, lon, 1)
    y_coeff = np.polyfit(y, lat, 1)
    pixels = np.asarray(trace["outline_pixels"])
    coordinates = np.stack(
        (np.polyval(x_coeff, pixels[:, 0]), np.polyval(y_coeff, pixels[:, 1])), axis=-1
    )
    geometry = shapely.Polygon(coordinates)
    if not geometry.is_valid:
        raise ValueError("Manual isopach trace is not a valid polygon")
    lon_error = np.polyval(x_coeff, x) - lon
    lat_error = np.polyval(y_coeff, y) - lat
    geod = Geod(ellps="WGS84")
    area = abs(geod.geometry_area_perimeter(geometry)[0]) / 1e6
    scale_east = geod.inv(121, 14, 121 + x_coeff[0], 14)[2]
    scale_north = geod.inv(121, 14, 121, 14 + abs(y_coeff[0]))[2]
    rms_east = np.sqrt(np.mean(lon_error**2)) / abs(x_coeff[0]) * scale_east
    rms_north = np.sqrt(np.mean(lat_error**2)) / abs(y_coeff[0]) * scale_north
    return dict(
        type="Feature",
        properties={
            "trace_id": trace["id"],
            "thickness_mm": 0.5,
            "source_id": "taal-study",
            "dependency_group": "taal-deposit-study",
            "derived_area_km2": area,
            "control_rmse_m": float(np.hypot(rms_east, rms_north)),
            "pixel_reading_bound_m": float(
                trace["digitizer_pixel_reading_bound_px"] * np.hypot(scale_east, scale_north)
            ),
            "lon_affine": x_coeff.tolist(),
            "lat_affine": y_coeff.tolist(),
            "uncertainty_limit": "Control/pixel error only; not full observation/map uncertainty",
        },
        geometry=shapely.geometry.mapping(geometry),
    )


if __name__ == "__main__":
    folder = ROOT / "data/source/taal-study"
    trace = json.loads((folder / "trace-science.json").read_text(encoding="utf-8"))
    result = georeference(trace)
    (folder / "trace-science.geojson").write_text(json.dumps(result, indent=2) + "\n")
    if (folder / "trace-qa.geojson").exists():
        second = json.loads((folder / "trace-qa.geojson").read_text(encoding="utf-8"))
        comparison = compare_traces(result, second)
        (folder / "trace-comparison.json").write_text(json.dumps(comparison, indent=2) + "\n")
    items = []
    metadata = json.loads((folder / "PMC8889389.1.json").read_text(encoding="utf-8"))
    expected_md5 = {
        "PMC8889389.1.xml": metadata["xml_url"].split("md5=")[1],
        "PMC8889389.1.pdf": metadata["pdf_url"].split("md5=")[1],
        "figure-4.jpg": next(u.split("md5=")[1] for u in metadata["media_urls"] if "Fig4_" in u),
    }
    for name in ("PMC8889389.1.json", "PMC8889389.1.xml", "PMC8889389.1.pdf", "figure-4.jpg"):
        path = folder / name
        digest = hashlib.md5(path.read_bytes()).hexdigest()
        if name in expected_md5 and digest != expected_md5[name]:
            raise ValueError(f"Archive metadata digest mismatch: {name}")
        source_name = "445_2022_1534_Fig4_HTML.jpg" if name == "figure-4.jpg" else name
        items.append(
            dict(
                file=name,
                url="https://pmc-oa-opendata.s3.amazonaws.com/PMC8889389.1/" + source_name,
                sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                md5=digest,
                metadata_md5_verified=name in expected_md5,
            )
        )
    (folder / "manifest.json").write_text(
        json.dumps(
            dict(
                publisher="NIH National Library of Medicine PMC open-data archive",
                article_publisher="Springer Nature; Balangue-Tarriela et al. 2022",
                article_license="CC BY 4.0 per article XML; third-party image terms may differ",
                current_archive_documentation="https://pmc-oa-opendata.s3.amazonaws.com/README.txt",
                accessed_at="2026-10-11",
                files=items,
                rejected_acquisition=dict(
                    file="figure-4.png", reason="HTML access challenge, not image"
                ),
                derived_assets=[
                    dict(file=name, sha256=hashlib.sha256((folder / name).read_bytes()).hexdigest())
                    for name in (
                        "figure-4-pdf-extract.png",
                        "trace-science.json",
                        "trace-science.geojson",
                        "trace-qa.json",
                        "trace-qa.geojson",
                        "trace-qa-evidence.json",
                        "trace-comparison.json",
                    )
                ],
            ),
            indent=2,
        )
        + "\n"
    )
    print(result["properties"])
