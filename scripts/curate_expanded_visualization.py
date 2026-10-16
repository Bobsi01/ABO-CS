"""Curate expanded visualization assets: province/region hierarchy,
literature-scale regional dispersion preset, and lightweight boundary GeoJSONs.
"""

import json
import re
import sys
from pathlib import Path

import shapely
import shapely.geometry
import shapely.ops

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend/src"))
from abo_api.contracts import Catalog  # noqa: E402

PSGC_PROVINCES: dict[str, tuple[str, str]] = {
    "04010": ("Batangas", "Region IV-A (CALABARZON)"),
    "04021": ("Cavite", "Region IV-A (CALABARZON)"),
    "04034": ("Laguna", "Region IV-A (CALABARZON)"),
    "04056": ("Quezon", "Region IV-A (CALABARZON)"),
    "04058": ("Rizal", "Region IV-A (CALABARZON)"),
    "04312": ("Quezon", "Region IV-A (CALABARZON)"),
    "03008": ("Bataan", "Region III (Central Luzon)"),
    "03014": ("Bulacan", "Region III (Central Luzon)"),
    "03049": ("Nueva Ecija", "Region III (Central Luzon)"),
    "03054": ("Pampanga", "Region III (Central Luzon)"),
    "03069": ("Tarlac", "Region III (Central Luzon)"),
    "03071": ("Zambales", "Region III (Central Luzon)"),
    "03077": ("Aurora", "Region III (Central Luzon)"),
    "03301": ("Pampanga", "Region III (Central Luzon)"),
    "03314": ("Zambales", "Region III (Central Luzon)"),
    "05005": ("Albay", "Region V (Bicol Region)"),
    "05016": ("Camarines Norte", "Region V (Bicol Region)"),
    "05017": ("Camarines Sur", "Region V (Bicol Region)"),
    "05041": ("Masbate", "Region V (Bicol Region)"),
    "05062": ("Sorsogon", "Region V (Bicol Region)"),
    "06019": ("Capiz", "Region VI (Western Visayas)"),
    "06030": ("Iloilo", "Region VI (Western Visayas)"),
    "06045": ("Negros Occidental", "Region VI (Western Visayas)"),
    "06079": ("Guimaras", "Region VI (Western Visayas)"),
    "06310": ("Iloilo", "Region VI (Western Visayas)"),
    "07012": ("Bohol", "Region VII (Central Visayas)"),
    "07022": ("Cebu", "Region VII (Central Visayas)"),
    "07046": ("Negros Oriental", "Region VII (Central Visayas)"),
    "18045": ("Negros Occidental", "Negros Island Region"),
    "18046": ("Negros Oriental", "Negros Island Region"),
    "17040": ("Marinduque", "MIMAROPA"),
    "17051": ("Occidental Mindoro", "MIMAROPA"),
    "17052": ("Oriental Mindoro", "MIMAROPA"),
    "17053": ("Palawan", "MIMAROPA"),
    "17059": ("Romblon", "MIMAROPA"),
    "01028": ("Ilocos Norte", "Region I (Ilocos Region)"),
    "01029": ("Ilocos Sur", "Region I (Ilocos Region)"),
    "01033": ("La Union", "Region I (Ilocos Region)"),
    "01055": ("Pangasinan", "Region I (Ilocos Region)"),
    "02015": ("Batanes", "Region II (Cagayan Valley)"),
    "02031": ("Cagayan", "Region II (Cagayan Valley)"),
    "02050": ("Isabela", "Region II (Cagayan Valley)"),
    "02057": ("Nueva Vizcaya", "Region II (Cagayan Valley)"),
    "02068": ("Quirino", "Region II (Cagayan Valley)"),
}


def get_province_region(code: str, kind: str = "municipality", name: str = "") -> tuple[str, str]:
    if kind == "airport":
        if "RPLL" in code or "Ninoy" in name:
            return ("Metro Manila (NCR)", "National Capital Region")
        if "RPLK" in code or "Bicol" in name:
            return ("Albay", "Region V (Bicol Region)")
        return ("Unknown", "Unknown")
    prefix = code[:5]
    if prefix.startswith("13"):
        return ("Metro Manila (NCR)", "National Capital Region")
    return PSGC_PROVINCES.get(prefix, ("Other", "Other"))


def norm(n: str) -> str:
    n = re.sub(r"\(.*?\)", "", n.casefold())
    n = n.replace("city of ", "").replace(" city", "").replace("district of ", "")
    return re.sub(r"[^a-z]", "", n)


def main():
    catalog_path = ROOT / "data/catalog.json"
    catalog_dict = json.loads(catalog_path.read_text(encoding="utf-8-sig"))

    raw_boundaries = json.loads(
        (ROOT / "data/source/municipal-boundaries.geojson").read_text(encoding="utf-8")
    )["features"]
    raw_centroids = {
        r["properties"]["shapeID"]: r
        for r in json.loads(
            (ROOT / "data/source/derived-municipal-centroids.json").read_text(encoding="utf-8")
        )
    }

    # 1. Update existing receptors with province and region
    for r in catalog_dict["receptors"]:
        code = r.get("admin_codes", {}).get("current", r["id"])
        prov, reg = get_province_region(code, r.get("kind", "municipality"), r.get("name", ""))
        r["province"] = prov
        r["region"] = reg
        # Ensure name includes province when missing and appropriate
        if (
            prov not in ("Other", "Unknown")
            and prov not in r["name"]
            and r.get("kind") == "municipality"
        ):
            r["name"] = f"{r['name']}, {prov}"

    # Receptors list stays exactly 318 municipalities + 2 airports to maintain
    # the frozen 2020/2024 census audit gates in test_gap_evidence.py

    # 2. Add regional scenario preset `taal-regional` if not present
    scenarios = catalog_dict["scenarios"]
    if not any(s["id"] == "taal-regional" for s in scenarios):
        taal_regional = {
            "id": "taal-regional",
            "name": "Taal regional dispersion scenario (literature scale)",
            "status": "illustrative",
            "scenario": {
                "volcano_id": "taal",
                "label": "Taal regional dispersion scenario (literature scale)",
                "input_status": "illustrative",
                "source_ids": ["gvp-taal", "taal-study", "assumptions"],
                "vent_lat": 14.0106,
                "vent_lon": 120.9975,
                "vent_elevation_m": 311.0,
                "column_height_m": 17000.0,
                "mass_rate_kg_s": 1500000.0,
                "duration_s": 36000.0,
                "wind_speed_m_s": 18.0,
                "wind_from_deg": 205.0,
                "diffusivity_m2_s": 1000.0,
                "initial_spread_m": 500.0,
                "bulk_density_kg_m3": 1000.0,
                "grains": [
                    {"diameter_um": 16.0, "fraction": 0.2, "settling_speed_m_s": 0.02},
                    {"diameter_um": 32.0, "fraction": 0.25, "settling_speed_m_s": 0.05},
                    {"diameter_um": 32.0, "fraction": 0.25, "settling_speed_m_s": 0.05},
                    {"diameter_um": 63.0, "fraction": 0.25, "settling_speed_m_s": 0.2},
                    {"diameter_um": 125.0, "fraction": 0.2, "settling_speed_m_s": 0.8},
                    {"diameter_um": 250.0, "fraction": 0.1, "settling_speed_m_s": 3.0},
                ][:5],  # 5 grain classes
                "domain_km": 300.0,
                "cell_km": 1.0,
                "release_layers": 16,
                "wind_profile": None,
                "pulses": None,
            },
        }
        # Correct grain fractions to sum exactly to 1.0
        taal_regional["scenario"]["grains"] = [
            {"diameter_um": 16.0, "fraction": 0.2, "settling_speed_m_s": 0.02},
            {"diameter_um": 32.0, "fraction": 0.25, "settling_speed_m_s": 0.05},
            {"diameter_um": 63.0, "fraction": 0.25, "settling_speed_m_s": 0.2},
            {"diameter_um": 125.0, "fraction": 0.2, "settling_speed_m_s": 0.8},
            {"diameter_um": 250.0, "fraction": 0.1, "settling_speed_m_s": 3.0},
        ]
        # Insert right after taal-teaching
        idx = next((i for i, s in enumerate(scenarios) if s["id"] == "taal-teaching"), -1)
        if idx >= 0:
            scenarios.insert(idx + 1, taal_regional)
        else:
            scenarios.append(taal_regional)
        print("Added 'taal-regional' scenario preset.")

    # Validate catalog against Pydantic Catalog contract
    validated = Catalog.model_validate(catalog_dict)
    catalog_path.write_text(
        json.dumps(validated.model_dump(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Saved updated catalog with {len(validated.receptors)} total receptors.")

    # 3. Generate lightweight municipal and provincial GeoJSON overlays for frontend
    muni_features = []
    prov_geometries: dict[str, list[shapely.geometry.base.BaseGeometry]] = {}

    # Match raw boundaries to active receptors by name and distance
    receptors_by_norm: dict[str, list[dict]] = {}
    for r in catalog_dict["receptors"]:
        if r.get("kind") == "municipality":
            receptors_by_norm.setdefault(norm(r["name"].split(",")[0]), []).append(r)

    for feat in raw_boundaries:
        prop = feat["properties"]
        shape_id = prop["shapeID"]
        center = raw_centroids.get(shape_id)
        if not center:
            continue

        k = norm(prop["shapeName"])
        candidates = receptors_by_norm.get(k, [])
        rec = None
        if len(candidates) == 1:
            rec = candidates[0]
        elif len(candidates) > 1:
            # Pick closest by Euclidean degrees
            closest = min(
                candidates,
                key=lambda c: (c["lat"] - center["lat"]) ** 2 + (c["lon"] - center["lon"]) ** 2,
            )
            dist_sq = (closest["lat"] - center["lat"]) ** 2 + (closest["lon"] - center["lon"]) ** 2
            if dist_sq < 0.05:  # ~25 km max deviation
                rec = closest

        prov = rec["province"] if rec else None
        if not prov:
            continue

        geom = shapely.geometry.shape(feat["geometry"])
        simplified = geom.simplify(0.002, preserve_topology=True)
        if not simplified.is_valid:
            simplified = simplified.buffer(0)

        feature_entry = {
            "type": "Feature",
            "properties": {
                "shapeID": shape_id,
                "name": rec["name"] if rec else prop["shapeName"],
                "receptor_id": rec["id"] if rec else shape_id,
                "province": prov,
                "region": rec.get("region", "Other"),
            },
            "geometry": shapely.geometry.mapping(simplified),
        }
        muni_features.append(feature_entry)
        prov_geometries.setdefault(prov, []).append(simplified)

    muni_geojson = {"type": "FeatureCollection", "features": muni_features}
    muni_out = ROOT / "frontend/public/municipal-boundaries.geojson"
    muni_out.write_text(json.dumps(muni_geojson, separators=(",", ":")), encoding="utf-8")
    kb_size = muni_out.stat().st_size / 1024
    print(f"Generated {muni_out} with {len(muni_features)} features ({kb_size:.1f} KB).")

    # Generate dissolved provincial boundaries GeoJSON
    prov_features = []
    for prov_name, geoms in prov_geometries.items():
        if not geoms:
            continue
        try:
            merged = shapely.ops.unary_union(geoms)
            if not merged.is_valid:
                merged = merged.buffer(0)
            prov_simple = merged.simplify(0.004, preserve_topology=True)
            prov_features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "province": prov_name,
                        "center_lon": round(prov_simple.centroid.x, 5),
                        "center_lat": round(prov_simple.centroid.y, 5),
                    },
                    "geometry": shapely.geometry.mapping(prov_simple),
                }
            )
        except Exception as e:
            print(f"Warning: failed union for {prov_name}: {e}")

    prov_geojson = {"type": "FeatureCollection", "features": prov_features}
    prov_out = ROOT / "frontend/public/provincial-boundaries.geojson"
    prov_out.write_text(json.dumps(prov_geojson, separators=(",", ":")), encoding="utf-8")
    p_kb_size = prov_out.stat().st_size / 1024
    print(f"Generated {prov_out} with {len(prov_features)} provinces ({p_kb_size:.1f} KB).")


if __name__ == "__main__":
    main()
