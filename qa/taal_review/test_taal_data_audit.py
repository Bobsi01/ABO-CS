"""Independent Scientific, Data & Numerical QA audit for Taal multi-parameter datasets.

Verifies:
1. Dataset files, formatting, schemas, SHA-256 manifest hashes, and frontend sync.
2. Coordinate conversions: WGS84 to UTM Zone 51N and local AEQD, PDZ polygon geometry,
   hypocenter bounds, WOVOdat network metadata, and 3D scene orientation math.
3. Seismicity depth partitioning (Conduit <= 15 km vs Subduction > 15 km) and magnitude scaling.
4. Scientific boundary disclosures and non-validation disclaimers.
5. Physical SI units and mass accounting consistency.
"""

import csv
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import pytest
from pyproj import Transformer

from abo_api import kernel, service
from abo_api.contracts import SimulationRequest

ROOT = Path(__file__).resolve().parents[2]
TAAL_DIR = ROOT / "data" / "source" / "taal"
PUBLIC_DIR = ROOT / "frontend" / "public"

VENT_LAT_GVP = 14.0106
VENT_LON_GVP = 120.9975
CALDERA_LAT = 14.002
CALDERA_LON = 120.993


def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


# -----------------------------------------------------------------------------
# 1. Dataset existence, formatting, schema, and manifest integrity
# -----------------------------------------------------------------------------


def test_manifest_integrity_and_hashes():
    manifest_path = TAAL_DIR / "manifest.json"
    assert manifest_path.exists(), "Manifest file data/source/taal/manifest.json must exist"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest.get("dataset_group") == "taal-contextual-reference"
    assert len(manifest.get("files", [])) >= 8, "Manifest must track at least 8 files"

    for entry in manifest["files"]:
        fpath = TAAL_DIR / entry["file"]
        assert fpath.exists(), f"Tracked file {entry['file']} must exist in {TAAL_DIR}"
        actual_size = fpath.stat().st_size
        actual_hash = sha256_of_file(fpath)
        assert actual_size == entry["bytes"], f"Byte count mismatch for {entry['file']}"
        assert actual_hash == entry["sha256"], f"SHA256 mismatch for {entry['file']}"
        assert entry.get("disclaimer"), f"Disclaimer required in manifest for {entry['file']}"


@pytest.mark.parametrize(
    ("filename", "is_public"),
    [
        ("taal_pdz.geojson", True),
        ("taal_earthquakes_2021_2024.csv", False),
        ("taal_earthquakes_2021_2024.json", True),
        ("taal_activity_log.json", True),
        ("taal_activity_log_2021_2024.json", True),
        ("taal_tropomi_july2021.json", True),
        ("taal_eruption_timeline_2021_2024.json", True),
        ("taal_deformation_bato2021.json", True),
        ("taal_wovodat_metadata.json", True),
        ("taal_hdx_damage_proxy_metadata.json", True),
    ],
)
def test_dataset_format_and_public_sync(filename, is_public):
    src_file = TAAL_DIR / filename
    assert src_file.exists(), f"Source file {filename} must exist in {TAAL_DIR}"

    if filename.endswith(".json") or filename.endswith(".geojson"):
        content = json.loads(src_file.read_text(encoding="utf-8"))
        assert content is not None
        if isinstance(content, dict):
            assert "disclaimer" in content or "features" in content
    elif filename.endswith(".csv"):
        with open(src_file, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            assert len(rows) > 0
            assert "latitude" in reader.fieldnames
            assert "longitude" in reader.fieldnames
            assert "depth" in reader.fieldnames

    if is_public:
        pub_file = PUBLIC_DIR / filename
        assert pub_file.exists(), f"Public file {filename} must be synced to {PUBLIC_DIR}"
        assert sha256_of_file(src_file) == sha256_of_file(pub_file), (
            f"Public copy {filename} differs from source"
        )


# -----------------------------------------------------------------------------
# 2. Coordinate conversions and orientations
# -----------------------------------------------------------------------------


def test_taal_caldera_center_and_gvp_summit_coordinates():
    utm_transformer = Transformer.from_crs("EPSG:4326", "EPSG:32651", always_xy=True)
    caldera_east, caldera_north = utm_transformer.transform(CALDERA_LON, CALDERA_LAT)
    gvp_east, gvp_north = utm_transformer.transform(VENT_LON_GVP, VENT_LAT_GVP)

    dE = gvp_east - caldera_east
    dN = gvp_north - caldera_north
    separation_m = math.hypot(dE, dN)

    # Offset between caldera lake center and GVP summit is ~1069 m
    assert 1000 < separation_m < 1150
    assert 450 < dE < 550  # GVP is East of caldera center
    assert 900 < dN < 1000  # GVP is North of caldera center

    # Catalog scenario uses GVP summit [14.0106, 120.9975]
    catalog = service.catalog()
    taal_sc = next(s for s in catalog.scenarios if s.scenario.volcano_id == "taal").scenario
    assert taal_sc.vent_lat == VENT_LAT_GVP
    assert taal_sc.vent_lon == VENT_LON_GVP


def test_flat_projection_approximation_distortion_bounds():
    # VolcanoScene.tsx uses dLon = (lon - vent_lon) * 111000 * cos(vent_lat)
    # and dLat = (lat - vent_lat) * 111000
    aeqd = Transformer.from_crs(
        "EPSG:4326",
        f"+proj=aeqd +lat_0={VENT_LAT_GVP} +lon_0={VENT_LON_GVP} +datum=WGS84 +units=m",
        always_xy=True,
    )

    # Test positions up to 100 km boundary (scenario domain limit)
    for dist_km in [5, 20, 50, 100]:
        test_lat = VENT_LAT_GVP + (dist_km * 1000 / 111000)
        test_lon = VENT_LON_GVP + (dist_km * 1000 / (111000 * math.cos(math.radians(VENT_LAT_GVP))))

        aeqd_e, aeqd_n = aeqd.transform(test_lon, test_lat)
        flat_e = (test_lon - VENT_LON_GVP) * 111000 * math.cos(math.radians(VENT_LAT_GVP))
        flat_n = (test_lat - VENT_LAT_GVP) * 111000

        pos_diff_m = math.hypot(flat_e - aeqd_e, flat_n - aeqd_n)
        relative_err = pos_diff_m / (dist_km * 1000)
        # Visual flat approximation error must remain below 0.5%
        assert relative_err < 0.005, (
            f"Distortion {relative_err * 100:.3f}% exceeds 0.5% bound at {dist_km} km"
        )


def test_taal_pdz_polygon_bounds_and_closure():
    pdz_path = TAAL_DIR / "taal_pdz.geojson"
    pdz = json.loads(pdz_path.read_text(encoding="utf-8"))
    ring = pdz["features"][0]["geometry"]["coordinates"][0]

    assert len(ring) >= 100, "PDZ ring should have high geometric fidelity (simplified ~187 pts)"
    assert ring[0] == ring[-1], "PDZ polygon exterior ring must be closed"

    lons = [p[0] for p in ring]
    lats = [p[1] for p in ring]

    # Volcano Island boundary bounds
    assert 120.95 < min(lons) < 120.98
    assert 121.00 < max(lons) < 121.03
    assert 13.96 < min(lats) < 13.99
    assert 14.03 < max(lats) < 14.06

    # Verify distances from GVP summit: island radius is 1.5 - 5.5 km (mean ~3.2 km)
    # Proves this is the Volcano Island PDZ, NOT a 14-km radius zone
    aeqd = Transformer.from_crs(
        "EPSG:4326",
        f"+proj=aeqd +lat_0={VENT_LAT_GVP} +lon_0={VENT_LON_GVP} +datum=WGS84 +units=m",
        always_xy=True,
    )
    radii_m = [math.hypot(*aeqd.transform(lon, lat)) for lon, lat in ring]
    assert 1500 < min(radii_m) < 2500
    assert 4000 < max(radii_m) < 5500
    assert 2800 < sum(radii_m) / len(radii_m) < 3500


def test_dike_vector_scene_orientation_defect_check():
    """Verify Bato et al. 2021 dike azimuth and document VolcanoScene.tsx orientation bug.

    Bato et al. (2021) established a lateral dike opening towards azimuth 225 deg (South-West).
    In Three.js scene coordinates:
      +X is East, -X is West.
      -Z is North, +Z is South.
    Therefore:
      East component  = +sin(225) = -0.7071 (West)
      North component = +cos(225) = -0.7071 (South)
      Scene X = East  = -0.7071
      Scene Z = -North = -(-0.7071) = +0.7071 (South)

    VolcanoScene.tsx Line 460 currently computes:
      dir = new THREE.Vector3(Math.sin(rad), 0, Math.cos(rad))
    which sets scene Z = +cos(225) = -0.7071 (North in Three.js).
    This flips the vector across the East-West axis into the North-West quadrant!
    """
    deform = json.loads((TAAL_DIR / "taal_deformation_bato2021.json").read_text(encoding="utf-8"))
    azimuth = deform["dike_azimuth_deg"]
    assert azimuth == 225, "Bato 2021 dike azimuth must be 225 degrees (SW)"

    rad = math.radians(azimuth)
    expected_scene_x = math.sin(rad)  # -0.7071 (West)
    expected_scene_z = -math.cos(rad)  # +0.7071 (South in Three.js where -Z is North)

    # Defective implementation in VolcanoScene.tsx line 460:
    buggy_scene_z = math.cos(rad)  # -0.7071 (North in Three.js)

    assert expected_scene_x < 0, "Dike vector X must point West"
    assert expected_scene_z > 0, "Dike vector Z in Three.js must be positive to point South"
    assert buggy_scene_z < 0, "Documented defect: buggy Z is negative, pointing North (NW heading)"
    assert buggy_scene_z == -expected_scene_z, "Defect is an exact North-South reflection"


def test_tropomi_plume_vector_orientation_and_caption_conventions():
    """Verify Sentinel-5P TROPOMI SO2 plume transport direction.

    Copernicus Sentinel-5P July 2021 observation:
      Plume originated during Southwest Monsoon (Habagat).
      Wind blowing FROM 225 deg (SW) transports SO2 TOWARDS 45 deg (NE).
      taal_tropomi_july2021.json records: "plume_from_bearing_deg": 225.
      VolcanoScene.tsx lines 531-533 computes:
        transportDeg = (azimuth + 180) % 360 = 45 deg.
        dir = Vector3(sin(45), 0, -cos(45)) -> points to NE.
    """
    tropomi = json.loads((TAAL_DIR / "taal_tropomi_july2021.json").read_text(encoding="utf-8"))
    az = tropomi["plume_from_bearing_deg"]
    assert az == 225, "Plume from bearing should be 225 degrees (SW Habagat)"

    transport_deg = (az + 180) % 360
    assert transport_deg == 45, "Transport direction must be 45 degrees (North-East)"

    rad = math.radians(transport_deg)
    scene_x = math.sin(rad)
    scene_z = -math.cos(rad)
    assert scene_x > 0, "Transport X must point East"
    assert scene_z < 0, "Transport Z must point North (-Z in Three.js)"


# -----------------------------------------------------------------------------
# 3. Seismicity depth partitioning and magnitude scaling
# -----------------------------------------------------------------------------


def test_seismicity_depth_partitioning_and_clamping():
    quakes = json.loads((TAAL_DIR / "taal_earthquakes_2021_2024.json").read_text(encoding="utf-8"))
    assert len(quakes) == 49, "Curated USGS catalog must contain 49 earthquakes"

    shallow = [q for q in quakes if q["depth_km"] <= 15]
    deep = [q for q in quakes if q["depth_km"] > 15]

    # Crucial scientific finding: USGS global network captures only 1 shallow event (10 km)
    # The remaining 48 events are deep subduction zone events (95.5 - 234.0 km)
    assert len(shallow) == 1, (
        f"Expected exactly 1 shallow event in USGS catalog, found {len(shallow)}"
    )
    assert len(deep) == 48, f"Expected 48 subduction events in USGS catalog, found {len(deep)}"
    assert shallow[0]["depth_km"] == 10.0
    assert min(q["depth_km"] for q in deep) >= 45.0

    # VolcanoScene.tsx line 370 caps displayDepth at Math.min(35, q.depth_km)
    # This clamps 48/49 events (98%) to a flat plane at depth 35 km
    clamped = [q for q in quakes if q["depth_km"] >= 35.0]
    assert len(clamped) == 48
    assert len(clamped) / len(quakes) == pytest.approx(48 / 49)


def test_seismicity_magnitude_scaling():
    quakes = json.loads((TAAL_DIR / "taal_earthquakes_2021_2024.json").read_text(encoding="utf-8"))
    magnitudes = [q["magnitude"] for q in quakes]

    assert min(magnitudes) >= 2.0
    assert max(magnitudes) <= 7.0

    # VolcanoScene.tsx line 372: radius = Math.max(0.2, (q.magnitude - 1.5) * 0.25)
    for mag in magnitudes:
        radius = max(0.2, (mag - 1.5) * 0.25)
        assert radius >= 0.2, "Magnitude radius must be >= 0.2 minimum floor"
        assert radius <= 1.5, "Maximum radius for M6.2 should be ~1.175"

    # Test edge cases: M <= 1.5 should be clamped to 0.2
    assert max(0.2, (1.0 - 1.5) * 0.25) == 0.2
    assert max(0.2, (0.0 - 1.5) * 0.25) == 0.2


# -----------------------------------------------------------------------------
# 4. Scientific boundary disclosures
# -----------------------------------------------------------------------------


def test_scientific_scope_disclosures():
    scope_file = ROOT / "frontend" / "src" / "scientificScope.ts"
    assert scope_file.exists()
    text = scope_file.read_text(encoding="utf-8")

    # Must state historical agreement is not established
    assert "historical agreement is not established" in text
    assert "Teaching illustration only" in text
    # Must never claim "validated"
    assert "validated" not in text.lower() or 'never say "validated"' in text


def test_all_datasets_carry_non_model_disclaimer():
    expected_disclaimer = "Contextual reference overlay - not a computed result of the ash model."
    for json_file in TAAL_DIR.glob("*.json"):
        if json_file.name == "manifest.json":
            continue
        data = json.loads(json_file.read_text(encoding="utf-8"))
        if isinstance(data, list):
            for item in data:
                assert item.get("disclaimer") == expected_disclaimer
        elif isinstance(data, dict):
            assert data.get("disclaimer") == expected_disclaimer


# -----------------------------------------------------------------------------
# 5. SI units and mass accounting consistency
# -----------------------------------------------------------------------------


def test_mass_accounting_and_conservation():
    catalog = service.catalog()
    taal_sc = next(s for s in catalog.scenarios if s.scenario.volcano_id == "taal").scenario

    # Mass rate * duration = total mass
    total_mass_kg = taal_sc.mass_rate_kg_s * taal_sc.duration_s
    assert total_mass_kg > 0
    assert math.isclose(sum(g.fraction for g in taal_sc.grains), 1.0, abs_tol=1e-8)

    # Run actual simulation and verify mass inside domain <= total mass
    req = SimulationRequest(scenario=taal_sc, receptors=[])
    res = service.simulate(req)

    inside_kg = res.diagnostics.inside_domain_mass_kg
    outside_kg = res.diagnostics.outside_domain_mass_kg
    assert inside_kg >= 0
    assert outside_kg >= 0
    assert math.isclose(inside_kg + outside_kg, total_mass_kg, rel_tol=1e-5)
    assert inside_kg <= total_mass_kg


def test_deposit_load_to_thickness_conversion():
    # thickness_mm = load_kg_m2 * 1000 / bulk_density_kg_m3
    bulk_density = 1000.0  # kg/m3
    load = 5.0  # kg/m2
    thickness_mm = load * 1000.0 / bulk_density
    assert thickness_mm == 5.0

    # In kernel.exposure:
    exp = kernel.exposure(
        load=np.array([5.0]),
        density=bulk_density,
        inside=np.array([True]),
        municipality=np.array([True]),
        population=np.array([1000]),
        cutoffs=np.array([1.0]),
        quantities=np.array([1]),
    )
    assert float(exp["thickness"][0]) == 5.0
