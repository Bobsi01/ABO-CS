"""Curate local offline contextual datasets for Taal volcano.

Datasets:
1. taal_pdz.geojson: PHIVOLCS Permanent Danger Zone polygon (Volcano Island).
2. taal_earthquakes_2021_2024.csv: Downloaded USGS FDSN seismicity catalog.
3. taal_earthquakes_2021_2024.json: Curated USGS FDSN seismicity around Taal.
4. taal_activity_log.json: Curated GVP / PHIVOLCS post-2020 unrest and SO2 log.
5. taal_tropomi_july2021.json: Sentinel-5P TROPOMI SO2 plume transport.
6. taal_eruption_timeline_2021_2024.json: Chronological eruption timeline.
7. taal_deformation_bato2021.json: Curated InSAR ground deformation parameters.
8. taal_wovodat_metadata.json: WOVOdat / PHIVOLCS-LAVA monitoring metadata.
9. taal_hdx_damage_proxy_metadata.json: HDX / NASA-JPL / EOS-RS DPM metadata.
10. manifest.json: SHA-256 hashes, citations, byte counts, and disclaimers.

All datasets are static local offline files for contextual reference overlays only.
They are never mixed into the Gaussian ash dispersion solver.
No em dashes are used anywhere in this file or output data.
"""

import csv
import hashlib
import json
import shutil
from pathlib import Path

import shapely
import shapely.geometry

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "source" / "taal"
GEO_FILE = ROOT / "frontend" / "public" / "geography-context.geojson"
FRONTEND_PUBLIC = ROOT / "frontend" / "public"

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
                    "authority": "OpenStreetMap contributors (shoreline approximation)",
                    "geometry_source": "frontend/public/geography-context.geojson; ODbL1.0",
                    "review_status": "approximate_context",
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
    target.write_text(json.dumps(pdz_geojson, indent=2), encoding="utf-8", newline="\n")
    print(f"Wrote {target} ({len(coords)} points)")


def curate_earthquakes():
    csv_path = OUT_DIR / "taal_earthquakes_2021_2024.csv"
    if csv_path.exists():
        earthquakes = []
        with open(csv_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("type") == "earthquake":
                    try:
                        earthquakes.append(
                            {
                                "id": row.get("id", ""),
                                "time": row.get("time", ""),
                                "latitude": float(row.get("latitude", 0.0)),
                                "longitude": float(row.get("longitude", 0.0)),
                                "depth_km": float(row.get("depth", 0.0)),
                                "magnitude": (float(row.get("mag")) if row.get("mag") else 0.0),
                                "place": row.get("place", ""),
                                "source": ("USGS Earthquake Hazards Program (FDSN)"),
                                "disclaimer": DISCLAIMER,
                            }
                        )
                    except (ValueError, TypeError):
                        continue
    else:
        raise FileNotFoundError(
            "Archived USGS CSV is required; no synthetic observations substituted"
        )

    target = OUT_DIR / "taal_earthquakes_2021_2024.json"
    target.write_text(json.dumps(earthquakes, indent=2), encoding="utf-8", newline="\n")
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
    for entry in log:
        entry["review_status"] = "source_blocked"
        entry["review_reason"] = (
            "Exact bulletin snapshots and per-value locators have not been reviewed"
        )
    target1 = OUT_DIR / "taal_activity_log.json"
    target1.write_text(json.dumps(log, indent=2), encoding="utf-8", newline="\n")
    target2 = OUT_DIR / "taal_activity_log_2021_2024.json"
    target2.write_text(json.dumps(log, indent=2), encoding="utf-8", newline="\n")
    print(f"Wrote {target1} and {target2} ({len(log)} log entries)")


def curate_deformation():
    deformation = {
        "citation": (
            "Bato et al. (2021). The 2020 eruption and large lateral dike emplacement at "
            "Taal Volcano, Philippines. Geophysical Research Letters, 48, e2021GL092803. "
            "doi:10.1029/2021GL092803"
        ),
        "period": "2020-01-12 to 2020-01-14",
        "max_uplift_cm": None,
        "dike_azimuth_deg": 225,
        "dike_length_km": 21,
        "dike_width_km": 8,
        "subsidence_continues_to": None,
        "review_status": "reviewed_geometry",
        "source_url": "https://horizon.documentation.ird.fr/exl-doc/pleins_textes/2021-06/010081426.pdf",
        "source_locator": "Page 8, section 5: 21 x 8 km near-vertical dike extending southwest",
        "source_sha256": "4c96830465928b5c742ec8a175233ee70bb5ab96ea9b5d9da28f22e179ce9c0e",
        "azimuth_status": (
            "225 degrees is schematic southwest, not an independently verified inversion angle"
        ),
        "method": ("Sentinel-1 InSAR interferometry and continuous GPS inversion"),
        "disclaimer": DISCLAIMER,
        "note": (
            "Derived co-eruptive geodetic parameters from peer-reviewed literature. "
            "Provided solely for geological reference and structural context."
        ),
    }
    target1 = OUT_DIR / "taal_deformation_bato2021.json"
    target1.write_text(json.dumps(deformation, indent=2), encoding="utf-8", newline="\n")
    target2 = OUT_DIR / "taal_deformation_2020_bato2021.json"
    target2.write_text(json.dumps(deformation, indent=2), encoding="utf-8", newline="\n")
    print(f"Wrote {target1} and {target2}")


def curate_tropomi():
    tropomi = {
        "date": "2021-07-01",
        "satellite": "Sentinel-5P TROPOMI",
        "product": "L2__SO2___",
        "plume_from_bearing_deg": None,
        "plume_length_km": None,
        "peak_so2_du": None,
        "review_status": "source_blocked",
        "source": ("Copernicus Data Space Ecosystem (https://dataspace.copernicus.eu/)"),
        "access_date": "2026-10-12",
        "disclaimer": DISCLAIMER,
        "note": (
            "Numerical observations withheld: no archived product granule, orbit, QA mask or "
            "reproducible plume derivation was supplied. Not empirical validation evidence."
        ),
    }
    target = OUT_DIR / "taal_tropomi_july2021.json"
    target.write_text(json.dumps(tropomi, indent=2), encoding="utf-8", newline="\n")
    print(f"Wrote {target}")


def curate_eruption_timeline():
    timeline = [
        {
            "date_phst": "2021-07-01 15:16 PHT",
            "event_type": "phreatomagmatic",
            "duration": "short-lived",
            "plume_height_m": 1000,
            "so2_t_day": 13287,
            "alert_level": 3,
            "source": "GVP BGVN 46:08 / PHIVOLCS Bulletin",
            "disclaimer": DISCLAIMER,
        },
        {
            "date_phst": "2021-07-07 05:18 PHT",
            "event_type": "phreatomagmatic_burst",
            "duration": "short-lived",
            "plume_height_m": 300,
            "so2_t_day": 7500,
            "alert_level": 3,
            "source": "GVP BGVN 46:08 / PHIVOLCS Bulletin",
            "disclaimer": DISCLAIMER,
        },
        {
            "date_phst": "2021-11-15 to 2021-11-22",
            "event_type": "phreatomagmatic_bursts_thermal",
            "duration": "7 days",
            "plume_height_m": 500,
            "so2_t_day": 3500,
            "alert_level": 2,
            "source": "GVP BGVN 46:12 / PHIVOLCS Bulletin",
            "disclaimer": DISCLAIMER,
        },
        {
            "date_phst": "2022-03-26 07:22 PHT",
            "event_type": "phreatomagmatic",
            "duration": "multi-day",
            "plume_height_m": 2000,
            "so2_t_day": 21000,
            "alert_level": 3,
            "source": "GVP BGVN 47:04 / PHIVOLCS Bulletin",
            "disclaimer": DISCLAIMER,
        },
        {
            "date_phst": "2022-04-01",
            "event_type": "phreatomagmatic_bursts",
            "duration": "short-lived",
            "plume_height_m": 700,
            "so2_t_day": 8500,
            "alert_level": 3,
            "source": "GVP BGVN 47:05 / PHIVOLCS Bulletin",
            "disclaimer": DISCLAIMER,
        },
        {
            "date_phst": "2022-10-05",
            "event_type": "minor_bursts_declining",
            "duration": "brief",
            "plume_height_m": 400,
            "so2_t_day": 2000,
            "alert_level": 1,
            "source": "GVP BGVN 47:11 / PHIVOLCS Bulletin",
            "disclaimer": DISCLAIMER,
        },
        {
            "date_phst": "2024-04-12",
            "event_type": "phreatic_new_vent",
            "duration": "single event",
            "plume_height_m": 2400,
            "so2_t_day": 4100,
            "alert_level": 1,
            "source": "PHIVOLCS Bulletin, 12 April 2024",
            "disclaimer": DISCLAIMER,
        },
    ]
    for entry in timeline:
        entry["review_status"] = "source_blocked"
        entry["review_reason"] = (
            "Exact bulletin snapshots and per-value locators have not been reviewed"
        )
    target = OUT_DIR / "taal_eruption_timeline_2021_2024.json"
    target.write_text(json.dumps(timeline, indent=2), encoding="utf-8", newline="\n")
    print(f"Wrote {target} ({len(timeline)} timeline events)")


def curate_wovodat():
    wovodat = {
        "volcano": "Taal",
        "gvp_volcano_number": "273070",
        "observatory": ("Philippine Institute of Volcanology and Seismology (PHIVOLCS)"),
        "portal_urls": {
            "wovodat": "https://wovodat.org",
            "phivolcs_lava": "https://wovodat.phivolcs.dost.gov.ph/",
        },
        "monitoring_networks": {
            "continuous_gps": {
                "status": "operational",
                "description": (
                    "Continuous geodetic monitoring of inflation and deflation "
                    "episodes on Volcano Island and caldera rim."
                ),
            },
            "tiltmeters": {
                "status": "operational",
                "description": (
                    "Electronic tilt monitoring stations detecting edifice deformation."
                ),
            },
            "so2_doas": {
                "status": "operational",
                "stations": ["Buco", "Tagaytay", "Pangasihan"],
                "description": (
                    "Differential Optical Absorption Spectroscopy for daily SO2 "
                    "emission flux measurement."
                ),
            },
            "seismic_network": {
                "status": "operational",
                "description": (
                    "Taal Volcano Network (TVN) recording local volcanic-tectonic "
                    "earthquakes, harmonic tremors, and low-frequency events."
                ),
            },
        },
        "license": ("Public institutional monitoring service (PHIVOLCS / WOVOdat)"),
        "disclaimer": DISCLAIMER,
        "note": (
            "Catalog of institutional multi-parameter monitoring infrastructure for Taal. "
            "Reference information compiled from WOVOdat and PHIVOLCS monitoring publications."
        ),
    }
    wovodat["review_status"] = "source_blocked"
    wovodat["review_reason"] = (
        "Institutional network and station claims require archived source review"
    )
    target = OUT_DIR / "taal_wovodat_metadata.json"
    target.write_text(json.dumps(wovodat, indent=2), encoding="utf-8", newline="\n")
    print(f"Wrote {target}")


def curate_hdx_damage_proxy():
    hdx_metadata = {
        "source": "Humanitarian Data Exchange (HDX) / NASA-JPL ARIA / EOS-RS",
        "portal_url": (
            "https://data.humdata.org/api/3/action/package_search?q=philippines+volcano"
        ),
        "datasets": [
            {
                "id": "eos_aria_2020_dpm",
                "title": ("Philippines Taal Volcano: Damage Proxy Map, Jan 2020"),
                "publisher": ("Earth Observatory of Singapore (EOS) / NASA-JPL ARIA"),
                "url": ("https://data.humdata.org/dataset/d49f060a-91a8-49b2-a66d-6d75d576b4d9"),
                "format": "GeoTIFF (COPERNICUS/Sentinel-1)",
                "date": "2020-01-15",
                "disclaimer": DISCLAIMER,
            },
            {
                "id": "eosrs_2026_dpm",
                "title": "Philippines Volcano Taal: Damage Proxy Map, Oct 2026",
                "publisher": "EOS-RS (Remote Sensing Lab)",
                "url": ("https://data.humdata.org/dataset/28f6e9f8-1277-49e9-8d5e-645cd030c758"),
                "format": "GeoTIFF (Sentinel-1 SAR)",
                "date": "2026-10-12",
                "disclaimer": DISCLAIMER,
            },
            {
                "id": "ocha_taal_3w",
                "title": ("Philippines: Who is Doing What and Where in Taal Volcano Eruption"),
                "publisher": "UN OCHA Philippines",
                "url": ("https://data.humdata.org/dataset/7e75d5cc-a645-49d7-8b42-59e46ab0feed"),
                "format": "XLSX",
                "disclaimer": DISCLAIMER,
            },
        ],
        "disclaimer": DISCLAIMER,
    }
    hdx_metadata["review_status"] = "source_blocked"
    hdx_metadata["review_reason"] = (
        "Dataset identities and direct artifacts have not been independently verified"
    )
    target = OUT_DIR / "taal_hdx_damage_proxy_metadata.json"
    target.write_text(json.dumps(hdx_metadata, indent=2), encoding="utf-8", newline="\n")
    print(f"Wrote {target}")


def sync_frontend_public():
    public_files = [
        "taal_pdz.geojson",
        "taal_earthquakes_2021_2024.json",
        "taal_activity_log.json",
        "taal_activity_log_2021_2024.json",
        "taal_tropomi_july2021.json",
        "taal_eruption_timeline_2021_2024.json",
        "taal_deformation_bato2021.json",
        "taal_wovodat_metadata.json",
        "taal_hdx_damage_proxy_metadata.json",
    ]
    for fname in public_files:
        src = OUT_DIR / fname
        if src.exists():
            dest = FRONTEND_PUBLIC / fname
            shutil.copy2(src, dest)
            print(f"Synced {fname} to {FRONTEND_PUBLIC}")


def curate_manifest():
    files = [
        "taal_pdz.geojson",
        "taal_earthquakes_2021_2024.csv",
        "taal_earthquakes_2021_2024.json",
        "taal_activity_log.json",
        "taal_activity_log_2021_2024.json",
        "taal_tropomi_july2021.json",
        "taal_eruption_timeline_2021_2024.json",
        "taal_deformation_bato2021.json",
        "taal_deformation_2020_bato2021.json",
        "taal_wovodat_metadata.json",
        "taal_hdx_damage_proxy_metadata.json",
    ]
    manifest = {
        "dataset_group": "taal-contextual-reference",
        "curation_date": "2026-10-15",
        "purpose": (
            "Static local reference overlays for Taal volcano context "
            "(PDZ, seismicity, activity timeline, InSAR deformation, TROPOMI plumes, WOVOdat, HDX)."
        ),
        "policy": (
            "Read-only offline files; never called at runtime over the network; "
            "never coupled to ash dispersion equations."
        ),
        "files": [],
    }
    for fname in files:
        fpath = OUT_DIR / fname
        if fpath.exists():
            manifest["files"].append(
                {
                    "file": fname,
                    "bytes": fpath.stat().st_size,
                    "sha256": sha256_file(fpath),
                    "disclaimer": DISCLAIMER,
                }
            )
    target = OUT_DIR / "manifest.json"
    target.write_text(json.dumps(manifest, indent=2), encoding="utf-8", newline="\n")
    print(f"Wrote {target} ({len(manifest['files'])} files tracked)")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    curate_pdz()
    curate_earthquakes()
    curate_activity_log()
    curate_deformation()
    curate_tropomi()
    curate_eruption_timeline()
    curate_wovodat()
    curate_hdx_damage_proxy()
    curate_manifest()
    sync_frontend_public()


if __name__ == "__main__":
    main()
