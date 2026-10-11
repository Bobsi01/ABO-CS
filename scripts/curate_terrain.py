"""Static geographic intake; Mayon raw DEM also supports the lava teaching model.

Run: uv run --project backend python scripts/curate_terrain.py
Sources are cached with SHA256 provenance. No dependency changes are needed.
"""

import argparse
import gzip
import hashlib
import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import shapely
from pyproj import CRS, Transformer
from scipy.ndimage import map_coordinates

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data" / "source" / "terrain"
PUBLIC = ROOT / "frontend" / "public"
TERRAIN = PUBLIC / "terrain"
SKADI = "https://s3.amazonaws.com/elevation-tiles-prod/skadi"
FORMATS = "https://raw.githubusercontent.com/tilezen/joerd/master/docs/formats.md"
NATURAL_EARTH = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
PH_BOUNDS = (116, 4, 127, 22)
OSM_TAAL = "https://www.openstreetmap.org/api/0.6/relation/270582/full"
MAYON_LAVA_TILES = {"N12E123.hgt.gz", "N12E124.hgt.gz", "N13E123.hgt.gz", "N13E124.hgt.gz"}


def read_source(filename, url, manifest):
    path = CACHE / filename
    if not path.exists():
        request = urllib.request.Request(url, headers={"User-Agent": "ABO static display curation"})
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = response.read()
        path.write_bytes(payload)
    payload = path.read_bytes()
    manifest[filename] = {
        "url": url,
        "sha256": hashlib.sha256(payload).hexdigest(),
        "bytes": len(payload),
        "role": (
            "geographic display and raw Mayon lava teaching input; never ashfall input"
            if filename in MAYON_LAVA_TILES
            else "display only; never a numerical ashfall input"
        ),
    }
    return payload


def osm_taal_lake(manifest):
    filename = "osm-taal-lake-270582.xml"
    raw = read_source(filename, OSM_TAAL, manifest)
    root = ET.fromstring(raw)
    relation = next(r for r in root.findall("relation") if r.attrib["id"] == "270582")
    tags = {t.attrib["k"]: t.attrib["v"] for t in relation.findall("tag")}
    if tags.get("water") != "lake" or tags.get("name") != "Taal Lake":
        raise ValueError("OSM relation 270582 is not the expected Taal Lake multipolygon")
    nodes = {
        n.attrib["id"]: (float(n.attrib["lon"]), float(n.attrib["lat"]))
        for n in root.findall("node")
    }
    ways = {
        w.attrib["id"]: shapely.LineString([nodes[n.attrib["ref"]] for n in w.findall("nd")])
        for w in root.findall("way")
    }
    members = relation.findall("member")
    if any(m.attrib["type"] != "way" for m in members):
        raise ValueError("Nested OSM members require an explicit reviewed geometry implementation")
    outer = [ways[m.attrib["ref"]] for m in members if m.attrib["role"] == "outer"]
    inner = [ways[m.attrib["ref"]] for m in members if m.attrib["role"] == "inner"]
    outer_poly = shapely.union_all(shapely.get_parts(shapely.polygonize(outer)))
    inner_poly = shapely.union_all(shapely.get_parts(shapely.polygonize(inner)))
    geometry = shapely.difference(outer_poly, inner_poly)
    if (
        geometry.is_empty
        or not geometry.is_valid
        or geometry.geom_type not in ("Polygon", "MultiPolygon")
    ):
        raise ValueError("Invalid or incomplete OSM Taal Lake geometry")
    projection = Transformer.from_crs(4326, 6933, always_xy=True)
    metadata = {
        "relation_id": 270582,
        "version": relation.attrib["version"],
        "timestamp": relation.attrib["timestamp"],
        "license": "ODbL 1.0",
        "attribution": "© OpenStreetMap contributors",
        "area_km2": shapely.transform(geometry, projection.transform, interleaved=False).area / 1e6,
        "bounds": list(geometry.bounds),
        "island_holes": int(np.sum(shapely.get_num_interior_rings(shapely.get_parts(geometry)))),
        "tagged_elevation_m": tags.get("ele"),
        "elevation_note": "OSM tag ele=2 differs from historical GVP3m illustration; neither is "
        "a current water-level observation",
    }
    manifest[filename].update(metadata)
    return geometry, metadata


def geography(manifest):
    bounds = shapely.box(*PH_BOUNDS)
    features = []
    collections = {}
    taal_lake_geometries = []
    try:
        taal_osm, taal_metadata = osm_taal_lake(manifest)
    except OSError as error:
        taal_osm = None
        taal_metadata = {"status": "unavailable", "reason": str(error)}
    for kind, filename in (
        ("land", "ne_10m_land.geojson"),
        ("lake", "ne_10m_lakes.geojson"),
    ):
        raw = read_source(filename, NATURAL_EARTH + filename, manifest)
        source_features = json.loads(raw)["features"]
        local = []
        for feature in source_features:
            geometry = shapely.from_geojson(json.dumps(feature["geometry"]))
            if not shapely.is_valid(geometry):
                geometry = shapely.make_valid(geometry)
            if not shapely.intersects(geometry, bounds):
                continue
            clipped = shapely.intersection(geometry, bounds)
            if clipped.is_empty:
                continue
            properties = {"kind": kind}
            if kind == "lake":
                properties["name"] = feature["properties"].get("name") or "Unnamed lake"
                if properties["name"] == "Lake Taal":
                    original_projection = Transformer.from_crs(4326, 6933, always_xy=True)
                    taal_metadata["natural_earth_original_area_km2"] = (
                        shapely.transform(
                            clipped, original_projection.transform, interleaved=False
                        ).area
                        / 1e6
                    )
                    if taal_osm is not None:
                        clipped = taal_osm
                        properties.update(
                            {
                                "geometry_source": "OpenStreetMap relation270582",
                                "osm_version": taal_metadata["version"],
                                "osm_timestamp": taal_metadata["timestamp"],
                                "attribution": "© OpenStreetMap contributors, ODbL1.0",
                            }
                        )
                    else:
                        properties["geometry_source"] = (
                            "Natural Earth generalized fallback; OSM source unavailable"
                        )
                    taal_lake_geometries.append(clipped)
            features.append(
                {
                    "type": "Feature",
                    "properties": properties,
                    "geometry": json.loads(shapely.to_geojson(clipped)),
                }
            )
            local.append(clipped)
        collections[kind] = shapely.union_all(local)
    collections["taal_lake"] = shapely.union_all(taal_lake_geometries)
    collections["taal_lake_osm"] = taal_osm is not None
    collections["taal_lake_metadata"] = taal_metadata
    output = {
        "type": "FeatureCollection",
        "features": features,
        "attribution": "Natural Earth public domain; Taal Lake © OpenStreetMap contributors, "
        "ODbL1.0; static display context only",
        "bounds": list(PH_BOUNDS),
    }
    target = PUBLIC / "geography-context.geojson"
    target.write_text(json.dumps(output, separators=(",", ":")), encoding="utf-8")
    return collections, target


def tile_name(latitude, longitude):
    return (
        f"{'N' if latitude >= 0 else 'S'}{abs(latitude):02d}"
        f"{'E' if longitude >= 0 else 'W'}{abs(longitude):03d}"
    )


def sample_elevation(lat, lon, manifest):
    lat_tile = np.floor(lat).astype(int)
    lon_tile = np.floor(lon).astype(int)
    pairs = np.unique(np.stack((lat_tile.ravel(), lon_tile.ravel()), axis=-1), axis=0)
    elevations = np.full(lat.shape, np.nan)
    tiles = []
    for latitude, longitude in pairs:
        name = tile_name(int(latitude), int(longitude))
        url = f"{SKADI}/{name[:3]}/{name}.hgt.gz"
        raw = gzip.decompress(read_source(name + ".hgt.gz", url, manifest))
        samples = np.frombuffer(raw, dtype=">i2")
        size = round(np.sqrt(samples.size))
        if size * size != samples.size or size not in (1201, 3601):
            raise ValueError(f"Unexpected HGT dimensions for {name}: {samples.size}")
        source = samples.reshape(size, size)
        selection = (lat_tile == latitude) & (lon_tile == longitude)
        row = (latitude + 1 - lat[selection]) * (size - 1)
        col = (lon[selection] - longitude) * (size - 1)
        row0, col0 = np.floor(row).astype(int), np.floor(col).astype(int)
        row1, col1 = np.minimum(row0 + 1, size - 1), np.minimum(col0 + 1, size - 1)
        void = (
            (source[row0, col0] == -32768)
            | (source[row0, col1] == -32768)
            | (source[row1, col0] == -32768)
            | (source[row1, col1] == -32768)
        )
        if np.any(void):
            raise ValueError(f"DEM void affects {np.count_nonzero(void)} display samples in {name}")
        elevations[selection] = map_coordinates(
            source.astype(np.float32),
            [row, col],
            order=1,
            mode="nearest",
            prefilter=False,
        )
        tiles.append(name)
    if not np.all(np.isfinite(elevations)):
        raise ValueError("Not all display terrain samples have finite elevations")
    return elevations, tiles


def generate_volcano(volcano, collections, manifest):
    axis = np.arange(-50000, 50001, 250, dtype=float)
    east, north = np.meshgrid(axis, axis)
    local = CRS.from_proj4(
        f"+proj=aeqd +lat_0={volcano['lat']} +lon_0={volcano['lon']} +datum=WGS84 +units=m +no_defs"
    )
    inverse = Transformer.from_crs(local, "EPSG:4326", always_xy=True)
    lon, lat = inverse.transform(east, north)
    elevation, tiles = sample_elevation(lat, lon, manifest)
    land = shapely.intersects_xy(collections["land"], lon, lat)
    lake = shapely.intersects_xy(collections["lake"], lon, lat)
    # Natural Earth can generalize away small islands. Preserve exposed DEM land
    # inside a generalized lake only above 10 m, and document the adjustment.
    authoritative_taal_water = (
        shapely.intersects_xy(collections["taal_lake"], lon, lat)
        if collections["taal_lake_osm"]
        else np.zeros(lake.shape, dtype=bool)
    )
    recovered_land = lake & ~authoritative_taal_water & (elevation > 10)
    lake &= ~recovered_land
    land |= recovered_land
    mask = np.where(lake, 2, np.where(land, 1, 0)).astype(np.uint8)
    levels = np.zeros(elevation.shape)
    taal_water = lake & shapely.intersects_xy(collections["taal_lake"], lon, lat)
    levels[taal_water] = 3
    source = {
        "title": "Mapzen Skadi DEM; Natural Earth land/lakes; OSM Taal Lake",
        "attribution": "Mapzen Terrain Tiles; SRTM/GMTED2010 USGS; ETOPO1 NOAA; "
        "Natural Earth public domain; Taal Lake © OpenStreetMap contributors, ODbL1.0",
        "url": FORMATS,
        "resolution_m": 250,
        "datum": "WGS84 horizontal / EGM96 geoid height metres",
        "review_status": (
            "derived geographic snapshot; raw DEM used by uncalibrated lava teaching model; "
            "not ashfall input or current topographic survey"
            if volcano["id"] == "mayon"
            else "derived display snapshot; not solver input or current topographic survey"
        ),
        "tiles": tiles,
        "native_dem_samples": "SRTM-style 1 degree HGT grid; bilinear sampled at 250 m",
        "lake_island_adjustment_samples": int(np.count_nonzero(recovered_land)),
        "lake_island_adjustment": "DEM >10 m preserved as exposed land within generalized lake; "
        "display-only heuristic, shoreline uncertainty; OSM Taal polygon/holes unchanged",
        "taal_lake_geometry": collections["taal_lake_metadata"],
        "taal_lake_level_note": "3 m schematic historical level from Smithsonian GVP, "
        "not current measured water level",
        "limitations": "Historical DEM and generalized coast/lakes; no terrain interception, "
        "wind modification, water interaction, or terrain-aware ash deposition",
    }
    output = {
        "volcano_id": volcano["id"],
        "origin": {"lat": volcano["lat"], "lon": volcano["lon"]},
        "east_m": axis.tolist(),
        "north_m": axis.tolist(),
        "elevation_m": np.round(elevation, 1).tolist(),
        "land_mask": mask.tolist(),
        "water_level_m": levels.tolist(),
        "vent_ground_m": volcano["elevation_m"],
        "source": source,
    }
    target = TERRAIN / f"{volcano['id']}.json"
    target.write_text(json.dumps(output, separators=(",", ":")), encoding="utf-8")
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    return {
        "file": target.relative_to(ROOT).as_posix(),
        "sha256": digest,
        "elevation_range_m": [float(np.min(elevation)), float(np.max(elevation))],
        "land_samples": int(np.count_nonzero(mask == 1)),
        "lake_samples": int(np.count_nonzero(mask == 2)),
        "sea_samples": int(np.count_nonzero(mask == 0)),
        "recovered_island_samples": int(np.count_nonzero(recovered_land)),
        "tiles": tiles,
    }


def restore_taal_island_geometry(context):
    """Keep the same display-only 250 m DEM island recovery in the map lake."""
    terrain = json.loads((TERRAIN / "taal.json").read_text(encoding="utf-8"))
    east, north = np.meshgrid(terrain["east_m"], terrain["north_m"])
    near_vent_land = (np.asarray(terrain["land_mask"]) == 1) & (east**2 + north**2 <= 5000**2)
    cells = shapely.box(
        east[near_vent_land] - 125,
        north[near_vent_land] - 125,
        east[near_vent_land] + 125,
        north[near_vent_land] + 125,
    )
    local_geometry = shapely.union_all(cells)
    origin = terrain["origin"]
    local = CRS.from_proj4(
        f"+proj=aeqd +lat_0={origin['lat']} +lon_0={origin['lon']} +datum=WGS84 +units=m +no_defs"
    )
    inverse = Transformer.from_crs(local, "EPSG:4326", always_xy=True)
    island = shapely.transform(local_geometry, inverse.transform, interleaved=False)
    geojson = json.loads(context.read_text(encoding="utf-8"))
    for feature in geojson["features"]:
        if feature["properties"].get("name") != "Lake Taal":
            continue
        lake = shapely.from_geojson(json.dumps(feature["geometry"]))
        feature["geometry"] = json.loads(shapely.to_geojson(shapely.difference(lake, island)))
        feature["properties"]["island_hole_source"] = (
            "Mapzen Skadi DEM >10m, 250m display cells within 5km of catalog vent; "
            "derived island/shoreline restoration, not surveyed geometry"
        )
    context.write_text(json.dumps(geojson, separators=(",", ":")), encoding="utf-8")


def check_assets():
    catalog = json.loads((ROOT / "data" / "catalog.json").read_text(encoding="utf-8-sig"))
    checks = []
    for volcano in catalog["volcanoes"]:
        target = TERRAIN / f"{volcano['id']}.json"
        asset = json.loads(target.read_text(encoding="utf-8"))
        elevation = np.asarray(asset["elevation_m"])
        mask = np.asarray(asset["land_mask"])
        east, north = np.meshgrid(asset["east_m"], asset["north_m"])
        assert elevation.shape == mask.shape == (401, 401)
        assert asset["origin"] == {"lat": volcano["lat"], "lon": volcano["lon"]}
        assert np.all(np.diff(asset["east_m"]) == 250)
        assert np.all(np.diff(asset["north_m"]) == 250)
        assert asset["east_m"][0] == asset["north_m"][0] == -50000
        assert asset["east_m"][-1] == asset["north_m"][-1] == 50000
        assert np.all(np.isfinite(elevation)) and np.all(np.isin(mask, [0, 1, 2]))
        assert asset["vent_ground_m"] == volcano["elevation_m"]
        assert np.count_nonzero(mask == 0) > 0 and np.count_nonzero(mask == 1) > 0
        check = {
            "volcano": volcano["id"],
            "shape": list(elevation.shape),
            "center_elevation_m": float(elevation[200, 200]),
            "center_land_mask": int(mask[200, 200]),
            "bytes": target.stat().st_size,
        }
        if volcano["id"] == "taal":
            nearby = east**2 + north**2 <= 5000**2
            ridge = nearby & (mask == 1) & (elevation >= 100)
            water = nearby & (mask == 2)
            assert np.count_nonzero(ridge) > 0 and np.count_nonzero(water) > 0
            assert np.all(np.asarray(asset["water_level_m"])[water] == 3)
            check["nearby_island_ridge_samples"] = int(np.count_nonzero(ridge))
            check["nearby_lake_samples"] = int(np.count_nonzero(water))
            lake_source = asset["source"]["taal_lake_geometry"]
            if lake_source.get("relation_id") == 270582:
                assert 220 < lake_source["area_km2"] < 260
                assert lake_source["island_holes"] >= 1
                taal_water_samples = np.count_nonzero(
                    (mask == 2) & (np.asarray(asset["water_level_m"]) == 3)
                )
                assert 220 < taal_water_samples * 0.25**2 < 260
                check["osm_taal_water_raster_area_km2"] = float(taal_water_samples * 0.25**2)
        checks.append(check)
    print(json.dumps({"asset_checks": checks}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", action="store_true", help="Validate existing assets without network"
    )
    if parser.parse_args().check:
        check_assets()
        return
    CACHE.mkdir(parents=True, exist_ok=True)
    TERRAIN.mkdir(parents=True, exist_ok=True)
    manifest = {}
    read_source("skadi-formats.md", FORMATS, manifest)
    read_source(
        "skadi-attribution.md",
        "https://raw.githubusercontent.com/tilezen/joerd/master/docs/attribution.md",
        manifest,
    )
    collections, context = geography(manifest)
    catalog = json.loads((ROOT / "data" / "catalog.json").read_text(encoding="utf-8-sig"))
    results = []
    for volcano in catalog["volcanoes"]:
        result = generate_volcano(volcano, collections, manifest)
        results.append(result)
        print(json.dumps(result))
    if not collections["taal_lake_osm"]:
        restore_taal_island_geometry(context)
    output = {
        "curated_at": datetime.now(UTC).isoformat(),
        "role": "static geographic assets; Mayon raw DEM also used by lava teaching model, "
        "never terrain-aware ashfall input",
        "sources": manifest,
        "terrain": results,
        "taal_lake_geometry": collections["taal_lake_metadata"],
        "geography_context_sha256": hashlib.sha256(context.read_bytes()).hexdigest(),
    }
    (CACHE / "manifest.json").write_text(json.dumps(output, indent=2), encoding="utf-8")
    check_assets()


if __name__ == "__main__":
    main()
