"""Derive this evaluator's independently frozen contour without model fitting."""

import hashlib
import json
from pathlib import Path

import numpy as np
import shapely
from pyproj import Geod, Transformer

ROOT = Path(__file__).resolve().parents[2]
FOLDER = ROOT / "qa/gap_closure"


def axis_fit(pixels, degrees):
    design = np.stack([np.array(pixels), np.ones(len(pixels))], axis=1)
    coefficients = np.linalg.lstsq(design, np.array(degrees), rcond=None)[0]
    residuals = design @ coefficients - np.array(degrees)
    return coefficients, residuals


def main():
    trace_path = FOLDER / "trace-qa.json"
    trace = json.loads(trace_path.read_text())
    longitude, longitude_residual = axis_fit(
        trace["longitude_tick_pixels"], trace["longitude_tick_degrees"]
    )
    latitude, latitude_residual = axis_fit(
        trace["latitude_tick_pixels"], trace["latitude_tick_degrees"]
    )
    pixels = np.array(trace["outline_pixels_xy"])
    coordinates = np.stack(
        [longitude[0] * pixels[:, 0] + longitude[1], latitude[0] * pixels[:, 1] + latitude[1]],
        axis=1,
    )
    polygon = shapely.Polygon(coordinates)
    assert polygon.is_valid
    assert polygon.area > 0
    transform = Transformer.from_crs("EPSG:4326", "EPSG:6933", always_xy=True)
    projected = shapely.transform(polygon, transform.transform, interleaved=False)
    geod = Geod(ellps="WGS84")
    metres_x = geod.inv(121, 14.5, 121 + abs(longitude[0]), 14.5)[2]
    metres_y = geod.inv(121, 14.5, 121, 14.5 + abs(latitude[0]))[2]
    geometry = {
        "type": "Feature",
        "properties": {
            "trace_id": trace["trace_id"],
            "thickness_mm": 0.5,
            "derived_evidence": True,
            "source_family": trace["source_family"],
            "independent_observation_count": 0,
        },
        "geometry": shapely.geometry.mapping(polygon),
    }
    output = {
        "trace_id": trace["trace_id"],
        "trace_sha256": hashlib.sha256(trace_path.read_bytes()).hexdigest(),
        "source_sha256": hashlib.sha256((ROOT / trace["source_path"]).read_bytes()).hexdigest(),
        "longitude_affine_slope_intercept": longitude.tolist(),
        "latitude_affine_slope_intercept": latitude.tolist(),
        "longitude_control_residual_deg": longitude_residual.tolist(),
        "latitude_control_residual_deg": latitude_residual.tolist(),
        "longitude_control_rmse_pixels": float(
            np.sqrt(np.mean(longitude_residual**2)) / abs(longitude[0])
        ),
        "latitude_control_rmse_pixels": float(
            np.sqrt(np.mean(latitude_residual**2)) / abs(latitude[0])
        ),
        "metres_per_pixel_approx_east_north": [metres_x, metres_y],
        "trace_plus_quantization_bound_m": 5 * max(metres_x, metres_y),
        "equal_area_polygon_km2": projected.area / 1_000_000,
        "trace_pixels": len(pixels),
        "limitation": trace["limitations"],
    }
    (FOLDER / "trace-qa.geojson").write_text(
        json.dumps(geometry, indent=2) + "\n", encoding="utf-8"
    )
    (FOLDER / "trace-qa-evidence.json").write_text(
        json.dumps(output, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
