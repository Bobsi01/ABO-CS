"""Compare two frozen manual traces as dependent source geometry only."""

import hashlib
import json
from pathlib import Path

import numpy as np
import shapely
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[2]
FOLDER = ROOT / "qa/gap_closure"


def fit(controls):
    pixels, degrees = np.asarray(controls).T
    coefficients = np.linalg.lstsq(
        np.stack([pixels, np.ones(pixels.size)], axis=1), degrees, rcond=None
    )[0]
    return coefficients


def main():
    qa_path = FOLDER / "trace-qa.geojson"
    science_path = ROOT / "data/source/taal-study/trace-science.json"
    qa = shapely.geometry.shape(json.loads(qa_path.read_text())["geometry"])
    source = json.loads(science_path.read_text())
    lon, lat = fit(source["longitude_controls"]), fit(source["latitude_controls"])
    pixels = np.asarray(source["outline_pixels"])
    science = shapely.Polygon(
        np.stack([pixels[:, 0] * lon[0] + lon[1], pixels[:, 1] * lat[0] + lat[1]], axis=1)
    )
    assert science.is_valid
    assert qa.is_valid
    transform = Transformer.from_crs("EPSG:4326", "EPSG:6933", always_xy=True)
    qa_metric = shapely.transform(qa, transform.transform, interleaved=False)
    science_metric = shapely.transform(science, transform.transform, interleaved=False)
    iou = (
        shapely.intersection(qa_metric, science_metric).area
        / shapely.union(qa_metric, science_metric).area
    )
    hausdorff = shapely.hausdorff_distance(qa_metric.boundary, science_metric.boundary, densify=0.1)
    vertices = shapely.get_coordinates(qa_metric.boundary)
    qa_to_science = shapely.distance(shapely.points(vertices), science_metric.boundary)
    reverse_vertices = shapely.get_coordinates(science_metric.boundary)
    science_to_qa = shapely.distance(shapely.points(reverse_vertices), qa_metric.boundary)
    result = {
        "comparison_kind": "Dependent source double-digitization; not model agreement",
        "qa_frozen_trace_sha256": hashlib.sha256(
            (FOLDER / "trace-qa.json").read_bytes()
        ).hexdigest(),
        "science_frozen_trace_sha256": hashlib.sha256(science_path.read_bytes()).hexdigest(),
        "qa_area_km2": qa_metric.area / 1_000_000,
        "science_area_km2": science_metric.area / 1_000_000,
        "trace_intersection_over_union": float(iou),
        "boundary_hausdorff_m_equal_area_projection": float(hausdorff),
        "bidirectional_vertex_to_boundary_median_m": float(
            np.median(np.r_[qa_to_science, science_to_qa])
        ),
        "narrative_area_km2": 8605,
        "table_3_area_km2": 3864.89,
        "independent_observation_count": 0,
        "limit": (
            "Both digitizers used the same published contour. Georeferencing assumes WGS84 "
            "from printed degree ticks. Registration and trace disagreement do not include "
            "original measurement, erosion or subjective contour uncertainty; no calibrated "
            "model or empirical acceptance test was run."
        ),
    }
    (FOLDER / "independent-trace-comparison.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
