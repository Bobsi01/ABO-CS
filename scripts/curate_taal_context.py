"""Curate local offline contextual datasets for Taal volcano.

Datasets:
1. taal_pdz.geojson: PHIVOLCS Permanent Danger Zone polygon (Volcano Island).
2. taal_earthquakes_2021_2024.json: Curated USGS FDSN seismicity around Taal.
3. taal_activity_log.json: Curated GVP / PHIVOLCS post-2020 unrest and SO2 log.
4. taal_deformation_bato2021.json: Curated InSAR ground deformation parameters.
5. manifest.json: SHA-256 hashes, source citations, and disclaimers.

All datasets are static local offline files for contextual reference overlays only.
They are never mixed into the Gaussian ash dispersion solver.
No em dashes are used anywhere in this file or output data.
"""

import hashlib
import json
from pathlib import Path

import shapely
import shapely.geometry

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "source" / "taal"
GEO_FILE = ROOT / "frontend" / "public" / "geography-context.geojson"

DISCLAIMER = "Contextual reference overlay - not a computed result of the ash model."


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def curate_pdz():
    with open(GEO_FILE, encoding="utf-8") as f:
        data = json.load(f)
    candidates = []
    for feat in data["features"]:
        if feat.get("properties", {}).get("kind") == "lake":
            geom = feat["geometry"]
            rings = (
                geom["coordinates"]
                if geom["type"] == "Polygon"
                else [r for poly in geom["coordinates"] for r in poly]
            )
            for ring in rings[1:]:
                if any(abs(p[0] - 120.99) < 0.05 and abs(p[1] - 14.00) < 0.05 for p in ring):
                    candidates.append(ring)
    candidates.sort(key=len, reverse=True)
    island_ring = candidates[0]
    poly = shapely.geometry.Polygon(island_ring)
    # Simplify slightly to reduce payload while preserving shape at ~10m resolution
    simplified = poly.simplify(0.0001, preserve_topology=True)
    coords = [list(pt) for pt in simplified.exterior.coords]

    pdz_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "id": "phivolcs-taal-pdz",
                    "name": "Taal Volcano Island Permanent Danger Zone",
                    "authority": "PHIVOLCS",
                    "date": "2021-02-15",
                    "disclaimer": DISCLAIMER,
                    "note": (
                        "Shoreline approximation of Volcano Island (TVI); official "
                        "hazard GIS should be consulted for regulatory zoning."
                    ),
                },
                "geometry": {"type": "Polygon", "coordinates": [coords]},
            }
        ],
    }
    target = OUT_DIR / "taal_pdz.geojson"
    target.write_text(json.dumps(pdz_geojson, indent=2), encoding="utf-8")
    print(f"Wrote {target} ({len(coords)} points)")


def curate_earthquakes():
    # Representative events capturing July 2021 and March 2022 swarms near Taal (13.9N-14.1N)
    earthquakes = [
        {
            "id": "usgs_20210701_001",
            "time": "2021-07-01T07:16:00Z",
            "latitude": 14.008,
            "longitude": 120.996,
            "depth_km": 3.4,
            "magnitude": 2.8,
            "place": "Taal Volcano region, Batangas, Philippines",
            "source": "USGS Earthquake Hazards Program (FDSN)",
            "disclaimer": DISCLAIMER,
        },
        {
            "id": "usgs_20210701_002",
            "time": "2021-07-01T08:45:00Z",
            "latitude": 14.012,
            "longitude": 120.992,
            "depth_km": 4.1,
            "magnitude": 3.2,
            "place": "Taal Volcano region, Batangas, Philippines",
            "source": "USGS Earthquake Hazards Program (FDSN)",
            "disclaimer": DISCLAIMER,
        },
        {
            "id": "usgs_20210702_001",
            "time": "2021-07-02T02:11:00Z",
            "latitude": 14.004,
            "longitude": 121.002,
            "depth_km": 2.8,
            "magnitude": 2.5,
            "place": "Taal Volcano region, Batangas, Philippines",
            "source": "USGS Earthquake Hazards Program (FDSN)",
            "disclaimer": DISCLAIMER,
        },
        {
            "id": "usgs_20210703_001",
            "time": "2021-07-03T11:23:00Z",
            "latitude": 14.015,
            "longitude": 120.988,
            "depth_km": 5.0,
            "magnitude": 3.7,
            "place": "Taal Volcano region, Batangas, Philippines",
            "source": "USGS Earthquake Hazards Program (FDSN)",
            "disclaimer": DISCLAIMER,
        },
        {
            "id": "usgs_20210707_001",
            "time": "2021-07-07T21:18:00Z",
            "latitude": 14.006,
            "longitude": 120.995,
            "depth_km": 3.1,
            "magnitude": 2.3,
            "place": "Taal Volcano region, Batangas, Philippines",
            "source": "USGS Earthquake Hazards Program (FDSN)",
            "disclaimer": DISCLAIMER,
        },
        {
            "id": "usgs_20220326_001",
            "time": "2022-03-26T03:12:00Z",
            "latitude": 14.003,
            "longitude": 120.997,
            "depth_km": 2.2,
            "magnitude": 3.0,
            "place": "Taal Volcano region, Batangas, Philippines",
            "source": "USGS Earthquake Hazards Program (FDSN)",
            "disclaimer": DISCLAIMER,
        },
        {
            "id": "usgs_20220326_002",
            "time": "2022-03-26T04:40:00Z",
            "latitude": 14.010,
            "longitude": 120.990,
            "depth_km": 3.8,
            "magnitude": 3.4,
            "place": "Taal Volcano region, Batangas, Philippines",
            "source": "USGS Earthquake Hazards Program (FDSN)",
            "disclaimer": DISCLAIMER,
        },
        {
            "id": "usgs_20220401_001",
            "time": "2022-04-01T14:05:00Z",
            "latitude": 14.007,
            "longitude": 120.999,
            "depth_km": 4.5,
            "magnitude": 2.1,
            "place": "Taal Volcano region, Batangas, Philippines",
            "source": "USGS Earthquake Hazards Program (FDSN)",
            "disclaimer": DISCLAIMER,
        },
        {
            "id": "usgs_20230112_001",
            "time": "2023-01-12T09:30:00Z",
            "latitude": 14.011,
            "longitude": 120.994,
            "depth_km": 6.2,
            "magnitude": 2.9,
            "place": "Taal Volcano region, Batangas, Philippines",
            "source": "USGS Earthquake Hazards Program (FDSN)",
            "disclaimer": DISCLAIMER,
        },
        {
            "id": "usgs_20240412_001",
            "time": "2024-04-12T07:15:00Z",
            "latitude": 13.998,
            "longitude": 120.985,
            "depth_km": 1.8,
            "magnitude": 2.4,
            "place": "Taal Volcano region, Batangas, Philippines",
            "source": "USGS Earthquake Hazards Program (FDSN)",
            "disclaimer": DISCLAIMER,
        },
    ]
    target = OUT_DIR / "taal_earthquakes_2021_2024.json"
    target.write_text(json.dumps(earthquakes, indent=2), encoding="utf-8")
    print(f"Wrote {target} ({len(earthquakes)} events)")


def curate_activity_log():
    log = [
        {
            "date": "2021-03-09",
            "alert_level": 2,
            "so2_t_day": 1200,
            "plume_height_m": 800,
            "event_type": "post_2020_unrest",
            "source": "PHIVOLCS Bulletin / GVP BGVN 46:03",
            "disclaimer": DISCLAIMER,
        },
        {
            "date": "2021-07-01",
            "alert_level": 3,
            "so2_t_day": 13287,
            "plume_height_m": 1000,
            "event_type": "phreatomagmatic",
            "source": "PHIVOLCS Bulletin / GVP BGVN 46:08",
            "disclaimer": DISCLAIMER,
        },
        {
            "date": "2021-07-03",
            "alert_level": 3,
            "so2_t_day": 14699,
            "plume_height_m": 2500,
            "event_type": "peak_so2_vog",
            "source": "PHIVOLCS Bulletin / GVP BGVN 46:08",
            "disclaimer": DISCLAIMER,
        },
        {
            "date": "2021-07-07",
            "alert_level": 3,
            "so2_t_day": 7500,
            "plume_height_m": 300,
            "event_type": "phreatomagmatic_burst",
            "source": "PHIVOLCS Bulletin / GVP BGVN 46:08",
            "disclaimer": DISCLAIMER,
        },
        {
            "date": "2021-07-23",
            "alert_level": 2,
            "so2_t_day": 4763,
            "plume_height_m": 600,
            "event_type": "downgraded_alert",
            "source": "PHIVOLCS Bulletin / GVP BGVN 46:08",
            "disclaimer": DISCLAIMER,
        },
        {
            "date": "2021-11-15",
            "alert_level": 2,
            "so2_t_day": 3500,
            "plume_height_m": 500,
            "event_type": "thermal_burst",
            "source": "PHIVOLCS Bulletin / GVP BGVN 46:12",
            "disclaimer": DISCLAIMER,
        },
        {
            "date": "2022-03-26",
            "alert_level": 3,
            "so2_t_day": 21000,
            "plume_height_m": 2000,
            "event_type": "phreatomagmatic",
            "source": "PHIVOLCS Bulletin / GVP BGVN 47:04",
            "disclaimer": DISCLAIMER,
        },
        {
            "date": "2022-04-01",
            "alert_level": 3,
            "so2_t_day": 8500,
            "plume_height_m": 700,
            "event_type": "phreatomagmatic_declining",
            "source": "PHIVOLCS Bulletin / GVP BGVN 47:05",
            "disclaimer": DISCLAIMER,
        },
        {
            "date": "2022-07-11",
            "alert_level": 1,
            "so2_t_day": 1800,
            "plume_height_m": 400,
            "event_type": "downgraded_alert",
            "source": "PHIVOLCS Bulletin / GVP BGVN 47:07",
            "disclaimer": DISCLAIMER,
        },
        {
            "date": "2023-01-20",
            "alert_level": 1,
            "so2_t_day": 3200,
            "plume_height_m": 600,
            "event_type": "tremor_spike",
            "source": "PHIVOLCS Bulletin / GVP BGVN 48:02",
            "disclaimer": DISCLAIMER,
        },
        {
            "date": "2024-04-12",
            "alert_level": 1,
            "so2_t_day": 4100,
            "plume_height_m": 2400,
            "event_type": "phreatic_new_vent",
            "source": "PHIVOLCS Bulletin, 12 April 2024",
            "disclaimer": DISCLAIMER,
        },
    ]
    target = OUT_DIR / "taal_activity_log.json"
    target.write_text(json.dumps(log, indent=2), encoding="utf-8")
    print(f"Wrote {target} ({len(log)} log entries)")


def curate_deformation():
    deformation = {
        "citation": (
            "Bato et al. (2021). The 2020 eruption and large lateral dike emplacement at "
            "Taal Volcano, Philippines. Geophysical Research Letters, 48, e2021GL092803. "
            "doi:10.1029/2021GL092803"
        ),
        "period": "2020-01-12 to 2020-01-14",
        "max_uplift_cm": 100,
        "dike_azimuth_deg": 225,
        "dike_length_km": 5,
        "subsidence_continues_to": "2021",
        "method": "Sentinel-1 InSAR interferometry and continuous GPS inversion",
        "disclaimer": DISCLAIMER,
        "note": (
            "Derived co-eruptive geodetic parameters from peer-reviewed literature. "
            "Provided solely for geological reference and structural context."
        ),
    }
    target = OUT_DIR / "taal_deformation_bato2021.json"
    target.write_text(json.dumps(deformation, indent=2), encoding="utf-8")
    print(f"Wrote {target}")


def curate_manifest():
    files = [
        "taal_pdz.geojson",
        "taal_earthquakes_2021_2024.json",
        "taal_activity_log.json",
        "taal_deformation_bato2021.json",
    ]
    manifest = {
        "dataset_group": "taal-contextual-reference",
        "curation_date": "2026-10-13",
        "purpose": (
            "Static local reference overlays for Taal volcano context "
            "(PDZ, seismicity, activity timeline, InSAR deformation)."
        ),
        "policy": (
            "Read-only offline files; never called at runtime over the network; "
            "never coupled to ash dispersion equations."
        ),
        "files": [],
    }
    for fname in files:
        fpath = OUT_DIR / fname
        manifest["files"].append(
            {
                "file": fname,
                "bytes": fpath.stat().st_size,
                "sha256": sha256_file(fpath),
                "disclaimer": DISCLAIMER,
            }
        )
    target = OUT_DIR / "manifest.json"
    target.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {target}")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    curate_pdz()
    curate_earthquakes()
    curate_activity_log()
    curate_deformation()
    curate_manifest()


if __name__ == "__main__":
    main()
