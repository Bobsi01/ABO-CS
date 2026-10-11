"""Independent static DEM sampling/hash audit; no renderer/scientific validation.

Run: uv run --project backend python qa/audit_terrain.py
Uses cached sources only. Does not import the asset-generation implementation.
Raw HGT/vector caches are optional and Git-ignored. Recreate them explicitly with
scripts/curate_terrain.py before this audit on a fresh checkout; packaged-asset
checks alone use scripts/curate_terrain.py --check without those caches.
"""

import gzip
import hashlib
import json
import math
import struct
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
import shapely
from pyproj import CRS, Transformer

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data/source/terrain"
manifest = json.loads((CACHE / "manifest.json").read_text(encoding="utf-8"))
missing_sources = [name for name in manifest["sources"] if not (CACHE / name).exists()]
if missing_sources:
    raise RuntimeError(
        "Optional raw display-source cache is missing; explicitly run "
        "uv run --project backend python scripts/curate_terrain.py before this audit. "
        f"Missing sources: {missing_sources}"
    )
for name, reference in manifest["sources"].items():
    payload = (CACHE / name).read_bytes()
    assert hashlib.sha256(payload).hexdigest() == reference["sha256"], name
    assert len(payload) == reference["bytes"], name

tile_cache = {}


def scalar_height(lat, lon):
    south, west = math.floor(lat), math.floor(lon)
    name = f"N{south:02d}E{west:03d}.hgt.gz"
    if name not in tile_cache:
        payload = gzip.decompress((CACHE / name).read_bytes())
        size = math.isqrt(len(payload) // 2)
        assert size * size * 2 == len(payload)
        tile_cache[name] = (payload, size)
    payload, size = tile_cache[name]
    row = (south + 1 - lat) * (size - 1)
    col = (lon - west) * (size - 1)
    r, c = math.floor(row), math.floor(col)
    fy, fx = row - r, col - c

    def h(y, x):
        value = struct.unpack_from(">h", payload, 2 * (y * size + x))[0]
        assert value != -32768
        return value

    return (
        h(r, c) * (1 - fx) * (1 - fy)
        + h(r, c + 1) * fx * (1 - fy)
        + h(r + 1, c) * (1 - fx) * fy
        + h(r + 1, c + 1) * fx * fy
    )


results = []
for reference in manifest["terrain"]:
    target = ROOT / reference["file"]
    payload = target.read_bytes()
    assert hashlib.sha256(payload).hexdigest() == reference["sha256"]
    asset = json.loads(payload)
    origin = asset["origin"]
    projection = CRS.from_proj4(
        f"+proj=aeqd +lat_0={origin['lat']} +lon_0={origin['lon']} +datum=WGS84 +units=m +no_defs"
    )
    inverse = Transformer.from_crs(projection, "EPSG:4326", always_xy=True)
    differences = []
    # Deliberately asymmetric row/column samples catch axis swaps/north flips.
    for row, col in [(0, 0), (400, 400), (37, 121), (261, 73), (200, 200)]:
        lon, lat = inverse.transform(asset["east_m"][col], asset["north_m"][row])
        expected = scalar_height(lat, lon)
        difference = abs(expected - asset["elevation_m"][row][col])
        assert difference <= 0.051, (asset["volcano_id"], row, col, difference)
        differences.append(difference)
    results.append(
        {
            "volcano": asset["volcano_id"],
            "samples": len(differences),
            "max_rounding_difference_m": max(differences),
            "reference_ground_m": asset["vent_ground_m"],
            "dem_center_m": asset["elevation_m"][200][200],
        }
    )
context = ROOT / "frontend/public/geography-context.geojson"
assert hashlib.sha256(context.read_bytes()).hexdigest() == manifest["geography_context_sha256"]

# Reconstruct the cached source relation independently; compare its native holes
# to the display geometry and water mask rather than accepting an area label.
xml = ET.fromstring((CACHE / "osm-taal-lake-270582.xml").read_bytes())
relation = next(item for item in xml.findall("relation") if item.attrib["id"] == "270582")
assert relation.attrib["version"] == manifest["taal_lake_geometry"]["version"]
assert relation.attrib["timestamp"] == manifest["taal_lake_geometry"]["timestamp"]
nodes = {
    item.attrib["id"]: (float(item.attrib["lon"]), float(item.attrib["lat"]))
    for item in xml.findall("node")
}
ways = {
    item.attrib["id"]: [nodes[node.attrib["ref"]] for node in item.findall("nd")]
    for item in xml.findall("way")
}


def rings(role):
    segments = [
        shapely.LineString(ways[item.attrib["ref"]])
        for item in relation.findall("member")
        if item.attrib["role"] == role
    ]
    return shapely.union_all(list(shapely.polygonize(segments).geoms))


water = shapely.difference(rings("outer"), rings("inner"))
assert shapely.is_valid(water)
geography = json.loads(context.read_bytes())
display_lake = next(
    feature for feature in geography["features"] if feature["properties"].get("name") == "Lake Taal"
)
display_water = shapely.from_geojson(json.dumps(display_lake["geometry"]))
difference_area = float(shapely.area(shapely.symmetric_difference(water, display_water)))
assert difference_area < 1e-12
island_holes = sum(len(polygon.interiors) for polygon in shapely.get_parts(water))
assert island_holes == manifest["taal_lake_geometry"]["island_holes"] == 7
equal_area = Transformer.from_crs("EPSG:4326", "EPSG:6933", always_xy=True)
area_km2 = shapely.area(shapely.transform(water, equal_area.transform, interleaved=False)) / 1e6
assert abs(area_km2 - manifest["taal_lake_geometry"]["area_km2"]) < 1e-6
taal = json.loads((ROOT / "frontend/public/terrain/taal.json").read_bytes())
origin = taal["origin"]
local = CRS.from_proj4(
    f"+proj=aeqd +lat_0={origin['lat']} +lon_0={origin['lon']} +datum=WGS84 +units=m +no_defs"
)
inverse = Transformer.from_crs(local, "EPSG:4326", always_xy=True)
east, north = np.meshgrid(taal["east_m"], taal["north_m"])
lon, lat = inverse.transform(east, north)
source_water = shapely.intersects_xy(water, lon, lat)
assert np.all(np.asarray(taal["land_mask"])[source_water] == 2)
assert np.all(np.asarray(taal["water_level_m"])[source_water] == 3)
assert np.array_equal(
    (np.asarray(taal["land_mask"]) == 2) & (np.asarray(taal["water_level_m"]) == 3),
    source_water,
)
assert taal["land_mask"][200][200] == 1  # Native island hole; no crater-water inference.
print(
    json.dumps(
        {
            "status": "PASS",
            "source_hashes": len(manifest["sources"]),
            "terrain_and_context_hashes": 4,
            "independent_scalar_samples": results,
            "source_relation_version": relation.attrib["version"],
            "source_lake_area_km2": float(area_km2),
            "source_water_mask_samples_checked": int(np.count_nonzero(source_water)),
            "source_island_holes": island_holes,
            "display_source_lake_symmetric_difference_deg2": difference_area,
            "limit": (
                "Historical source sampling/provenance only; shoreline heuristic, current survey, "
                "browser rendering and ash physics not certified."
            ),
        }
    )
)
