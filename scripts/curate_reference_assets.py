"""One-time, explicitly invoked static reference intake; never an application service.

Run with the backend environment and temporary Shapely dependency:
uv run --with shapely python ../scripts/curate_reference_assets.py
Downloads published files, records hashes, and derives equal-area municipal centroids.
No scientific network call occurs while ABO runs.
"""

import hashlib
import json
import urllib.request
from pathlib import Path
from urllib.error import HTTPError

import numpy as np
import shapely
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "source"
ASSETS = ROOT / "frontend" / "public"
BASE = "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/PHL/ADM3/"
URLS = {
    "municipal-boundaries.geojson": BASE + "geoBoundaries-PHL-ADM3_simplified.geojson",
    "municipal-boundaries-metadata.json": BASE + "geoBoundaries-PHL-ADM3-metaData.json",
    "natural-earth-coastline.geojson": "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_coastline.geojson",
    "cavite-quickstat-may-2026.pdf": "https://rsso04a.psa.gov.ph/sites/default/files/attachment-dir/Cavite%20QuickSTAT_May%202026.pdf",
}


def main():
    SOURCE.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    manifest = []
    for filename, url in URLS.items():
        path = SOURCE / filename
        if not path.exists():
            request = urllib.request.Request(
                url, headers={"User-Agent": "ABO academic reference curation"}
            )
            try:
                with urllib.request.urlopen(request, timeout=90) as response:
                    path.write_bytes(response.read())
            except HTTPError as error:
                manifest.append(
                    {"file": filename, "url": url, "status": f"Unavailable: HTTP {error.code}"}
                )
                print(f"Unavailable {filename}: HTTP {error.code}; no substitute data used")
                continue
        manifest.append(
            {"file": filename, "url": url, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
        )
        print(f"Read {filename}: {path.stat().st_size:,} bytes")

    feature_collection = json.loads(
        (SOURCE / "municipal-boundaries.geojson").read_text(encoding="utf-8")
    )
    features = feature_collection["features"]
    # JSON ingestion is separate from the vectorized geographic derivation.
    geometries = shapely.from_geojson(np.asarray([json.dumps(f["geometry"]) for f in features]))
    projection = Transformer.from_crs("EPSG:4326", "EPSG:6933", always_xy=True)
    inverse = Transformer.from_crs("EPSG:6933", "EPSG:4326", always_xy=True)
    projected = shapely.transform(geometries, projection.transform, interleaved=False)
    centers = shapely.centroid(projected)
    lon, lat = inverse.transform(shapely.get_x(centers), shapely.get_y(centers))
    records = []
    for feature, latitude, longitude in zip(features, lat, lon, strict=True):
        records.append(
            {
                "properties": feature["properties"],
                "lat": round(float(latitude), 6),
                "lon": round(float(longitude), 6),
            }
        )
    (SOURCE / "derived-municipal-centroids.json").write_text(
        json.dumps(records, indent=2), encoding="utf-8"
    )

    coastline = json.loads((SOURCE / "natural-earth-coastline.geojson").read_text(encoding="utf-8"))
    # Clip public-domain display geometry only; it is never a physical solver input.
    clipped = []
    for feature in coastline["features"]:
        geometry = shapely.from_geojson(json.dumps(feature["geometry"]))
        result = shapely.intersection(geometry, shapely.box(115, 4, 130, 23))
        if not shapely.is_empty(result):
            clipped.append(
                {
                    "type": "Feature",
                    "properties": {},
                    "geometry": json.loads(shapely.to_geojson(result)),
                }
            )
    output = {
        "type": "FeatureCollection",
        "features": clipped,
        "attribution": "Natural Earth, public domain; clipped for display only",
    }
    (ASSETS / "offline-coastline.geojson").write_text(
        json.dumps(output, separators=(",", ":")), encoding="utf-8"
    )
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Derived {len(records)} centroids; clipped {len(clipped)} coastline features")
    print("Review names, PSGC crosswalk, dates and populations before adding catalog records.")


if __name__ == "__main__":
    main()
