# Independent Scientific, Data & Numerical QA Audit Report: Taal Volcano Multi-Parameter Reference Context

**Evaluator:** Independent Scientific, Data & Numerical QA Evaluator  
**Milestone:** Taal Focus Multi-Parameter Verification  
**Evaluation Standard:** `skills/abo-qa/SKILL.md`, `skills/abo-numerical-modeling/SKILL.md`, `AGENTS.md`  
**Date:** 2026-10-14  
**Test Fixture:** `qa/taal_review/test_taal_data_audit.py` (22/22 passed in 1.46s; full suite 191/191 passed)

---

## 1. Executive Summary

This independent evaluation audits the 8 curated open-source Taal volcanic datasets, their coordinate systems and projections, physical units, depth partitioning, orientation mathematics, and scientific boundary disclosures in the ABO codebase.

The curation architecture cleanly adheres to ABO's core scientific policy:
- **Strict Decoupling:** Contextual observational datasets are read-only offline assets used exclusively for reference overlays in UI components (`HistoricalReferences.tsx`, `EruptionTimeline.tsx`, and `VolcanoScene.tsx`). They are completely decoupled from the Gaussian ashfall dispersion solver in `backend/src/abo_api/kernel.py`.
- **Integrity:** All 11 files in `data/source/taal/` match their declared SHA-256 hashes and byte counts in `manifest.json`.
- **Boundary Disclosures:** Non-model reference disclaimers are uniformly attached to all JSON entities and GeoJSON feature collections. No unvalidated retrospective predictive claims are made.

However, the independent audit discovered **one Critical Defect (P0)**, **two Major Scientific Inconsistencies (P1)**, and **four Minor Governance Findings (P2)** that require remediation by the implementation owners.

### Summary of Categorized Findings

| ID | Severity | Component | Finding Summary |
|---|---|---|---|
| **QA-TAAL-01** | **Critical (P0)** | `VolcanoScene.tsx` (L460) | **Dike Vector North-South Flip:** Modeled 2020 dike vector uses `Math.cos(rad)` instead of `-Math.cos(rad)` in Three.js coordinates, projecting the azimuth 225° SW dike into the **North-West** quadrant (azimuth 315°). |
| **QA-TAAL-02** | **Major (P1)** | `VolcanoScene.tsx` (L370, L789) | **Seismicity Depth Shelf Artifact & Partitioning:** 98% (48/49) of USGS earthquakes are deep subduction slab events (47–234 km). The UI filter "Conduit (≤15 km)" displays only 1 event, while all 48 deep events are artificial clamped to 35 km depth, flattening into an unrealistic planar shelf. |
| **QA-TAAL-03** | **Major (P1)** | `VolcanoScene.tsx` (L805) & `taal_tropomi_july2021.json` | **TROPOMI Plume Bearing vs Transport Vector Conflation:** Caption describes "transport bearing (225° from SW)" while rendering a transport arrow towards 45° NE, confusing meteorological "wind from" with transport vector heading. |
| **QA-TAAL-04** | **Minor (P2)** | `taal_pdz.geojson` & Documentation | **PDZ Nomenclature Clarity:** The dataset geometry represents the permanent Volcano Island (TVI) shoreline boundary (~1.7–5.0 km radius), not the temporary 14-km evacuation buffer declared during the January 2020 Level 4 crisis. |
| **QA-TAAL-05** | **Minor (P2)** | `taal_wovodat_metadata.json` | **Missing WOVOdat Station Coordinates:** Monitoring stations ("Buco", "Tagaytay", "Pangasihan") are recorded as strings without latitude, longitude, or elevation, preventing spatial representation. |
| **QA-TAAL-06** | **Minor (P2)` | `scripts/curate_taal_context.py` (L483) | **Incomplete Public Sync Manifest:** `sync_frontend_public()` omitted `taal_hdx_damage_proxy_metadata.json` from its file copy array, creating risk of stale public exposure data upon re-curation. |
| **QA-TAAL-07** | **Minor (P2)** | `VolcanoScene.tsx` (L569) | **Column Altimeter Flight Level Datum:** Flight level ticks (FL160–FL650) are measured above vent elevation rather than Mean Sea Level (MSL), creating a datum shift for elevated volcanic vents. |

---

## 2. Dataset Verification & Manifest Integrity (Task 1)

### 2.1 Inventory of Curated Taal Datasets

The audit verified all 8 multi-parameter datasets across `data/source/taal/` and `frontend/public/`:

| Dataset | Primary Source | Source Path | Public Path | Format | Status | SHA-256 Integrity |
|---|---|---|---|---|---|---|
| **1. Volcano Island PDZ** | PHIVOLCS | `data/source/taal/taal_pdz.geojson` | `frontend/public/taal_pdz.geojson` | GeoJSON (187 pts) | Verified | `a851123c23...` (Match) |
| **2. Seismicity Catalog** | USGS FDSN | `data/source/taal/taal_earthquakes_2021_2024.csv`<br>`data/source/taal/taal_earthquakes_2021_2024.json` | `frontend/public/taal_earthquakes_2021_2024.json` | CSV (51 rows)<br>JSON (49 events) | Verified | `9712ac01ff...` (CSV)<br>`b3beec88b8...` (JSON) |
| **3. Unrest Activity Log** | PHIVOLCS / GVP | `data/source/taal/taal_activity_log.json`<br>`data/source/taal/taal_activity_log_2021_2024.json` | `frontend/public/taal_activity_log.json`<br>`frontend/public/taal_activity_log_2021_2024.json` | JSON (11 entries) | Verified | `14d833897c...` (Match) |
| **4. Eruption Timeline** | PHIVOLCS / GVP | `data/source/taal/taal_eruption_timeline_2021_2024.json` | `frontend/public/taal_eruption_timeline_2021_2024.json` | JSON (7 events) | Verified | `55de179aaf...` (Match) |
| **5. InSAR Dike Deformation** | Bato et al. (2021) GRL | `data/source/taal/taal_deformation_bato2021.json`<br>`data/source/taal/taal_deformation_2020_bato2021.json` | `frontend/public/taal_deformation_bato2021.json` | JSON (1 parameter set) | Verified | `c69ead77cd...` (Match) |
| **6. Monitoring Infrastructure** | WOVOdat / PHIVOLCS | `data/source/taal/taal_wovodat_metadata.json` | `frontend/public/taal_wovodat_metadata.json` | JSON (4 networks) | Verified | `d20849de4b...` (Match) |
| **7. TROPOMI SO₂ Plume** | Sentinel-5P / Copernicus | `data/source/taal/taal_tropomi_july2021.json` | `frontend/public/taal_tropomi_july2021.json` | JSON (1 observation) | Verified | `ad71c280ae...` (Match) |
| **8. Damage Proxy Metadata** | NASA-JPL ARIA / HDX | `data/source/taal/taal_hdx_damage_proxy_metadata.json` | `frontend/public/taal_hdx_damage_proxy_metadata.json` | JSON (3 datasets) | Verified | `8cbbb2a3fc...` (Match) |

### 2.2 Manifest Audit Findings
- `data/source/taal/manifest.json` correctly tracks 11 individual file hashes and byte lengths.
- In `scripts/curate_taal_context.py` line 483, `sync_frontend_public()` enumerates 8 files to copy to `frontend/public/`. It omitted `taal_hdx_damage_proxy_metadata.json` from the array (`public_files`), although the file was present in `frontend/public/` from prior copy. (Logged as **QA-TAAL-06**).

---

## 3. Coordinate Systems, Projections & Scene Orientations (Task 2)

### 3.1 Taal Origin & Caldera Geometry
Taal features two distinct geographic reference centers:
1. **Caldera / Crater Lake Center:** `[14.002° N, 120.993° E]` (Lake elevation ~3 m ASL).
   - In UTM Zone 51N (EPSG:32651): East = 283,224.97 m, North = 1,548,866.40 m.
2. **GVP Summit / Terrain Vent Origin:** `[14.0106° N, 120.9975° E]` (Crater rim elevation 311 m ASL).
   - In UTM Zone 51N (EPSG:32651): East = 283,719.25 m, North = 1,549,813.92 m.
   - Spatial offset: $\Delta East = +494.27\text{ m}$, $\Delta North = +947.52\text{ m}$, Euclidean distance $= 1,068.69\text{ m}$.

**Terrain Origin Alignment:** The simulation catalog and `frontend/public/terrain/taal.json` standardize on the GVP summit `[14.0106, 120.9975]`. If a user manually changes the vent to `[14.002, 120.993]`, `matchesTerrainOrigin()` in `terrain.ts` intentionally trips and falls back to schematic mode.

### 3.2 Visual Flat Projection Distortion Bounds
`VolcanoScene.tsx` converts WGS84 offsets to scene coordinates using spherical approximations:
$$\Delta East = (\lambda - \lambda_{vent}) \times 111,000 \times \cos(\phi_{vent})$$
$$\Delta North = (\phi - \phi_{vent}) \times 111,000$$

Numerical verification against exact Azimuthal Equidistant (AEQD WGS84) projection yields:
- At 5 km: $\Delta = 21.3\text{ m}$ (0.427% distortion)
- At 20 km: $\Delta = 40.6\text{ m}$ (0.406% distortion)
- At 50 km: $\Delta = 124.7\text{ m}$ (0.249% distortion)
- At 100 km (Domain Edge): $\Delta = 152.1\text{ m}$ (0.152% distortion)

Distortion is bounded below 0.5% everywhere within the domain, which is fully acceptable for 3D illustrative rendering.

### 3.3 Critical Defect: Dike Vector North-South Flip (QA-TAAL-01)

#### Physical & Literature Ground Truth
Bato et al. (2021, *Geophysical Research Letters*, doi:10.1029/2021GL092803) determined that during the 12–14 January 2020 eruption, a lateral dike intruded **southwestward** from the caldera towards Lemery and Balayan Bay along an azimuth of **225°**.
- Azimuth $\theta = 225^\circ$:
  - $East = \sin(225^\circ) = -\frac{\sqrt{2}}{2} \approx -0.7071$ (West)
  - $North = \cos(225^\circ) = -\frac{\sqrt{2}}{2} \approx -0.7071$ (South)

#### Three.js Coordinate Frame in `VolcanoScene.tsx`
The scene orientation defined by the Compass (L301) and Wind arrow (L248) establishes:
- $+X = \text{East}$, $-X = \text{West}$
- $-Z = \text{North}$, $+Z = \text{South}$
- $+Y = \text{Up}$, $-Y = \text{Down}$

Therefore, an azimuth $\theta$ clockwise from North must be mapped to Three.js coordinates as:
$$X = \sin(\theta)$$
$$Z = -\cos(\theta)$$

#### Observed Defective Code in `VolcanoScene.tsx` (Line 460)
```typescript
const rad = (data.dike_azimuth_deg * Math.PI) / 180
const dir = new THREE.Vector3(Math.sin(rad), 0, Math.cos(rad)).normalize()
```
Notice that $Z$ is assigned $+\cos(rad)$, omitting the mandatory negative sign!

#### Defect Consequence
When $\theta = 225^\circ$:
- $X = \sin(225^\circ) = -0.7071$ (West)
- $Z = \cos(225^\circ) = -0.7071$ (In Three.js, **negative Z points North**!)

As a result, the dike vector in `VolcanoScene.tsx` points towards **North-West (azimuth 315°)** instead of South-West (azimuth 225°)! It points towards Tagaytay Ridge instead of Lemery / Balayan Bay.
By contrast, `TaalTropomiPlumeCue` (Line 533) correctly implemented:
```typescript
const dir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize()
```
**Required Fix for Implementation Owner:** In `VolcanoScene.tsx` line 460, change `Math.cos(rad)` to `-Math.cos(rad)`.

### 3.4 TROPOMI Plume Vector Transport vs Wind Convention (QA-TAAL-03)
In `data/source/taal/taal_tropomi_july2021.json`:
- `"plume_from_bearing_deg": 225`
In `VolcanoScene.tsx` lines 531–533:
```typescript
const transportDeg = (azimuth + 180) % 360  // 225 + 180 = 45 deg (NE)
const rad = (transportDeg * Math.PI) / 180
const dir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize()
```
The arrow points towards 45° (North-East), matching the Southwest Monsoon (Habagat) transport direction.
However, Line 805 caption reads:
`"Blue arrow indicates satellite-observed plume transport bearing (225° from SW)"`
This is confusing: 225° is the *wind origin* (wind-from direction), whereas the *transport bearing* is 45° (NE).
**Recommended Fix:** Clarify caption to: `"satellite-observed plume transport towards 45° NE (wind from 225° SW)"`.

---

## 4. Seismicity Depth Partitioning & Magnitude Scaling (Task 3)

### 4.1 Depth Partitioning & Subduction Dominance (QA-TAAL-02)
The UI in `VolcanoScene.tsx` lines 787–791 offers three depth radio choices:
- `All depths`
- `Conduit (≤15 km)`
- `Subduction (>15 km)`

An exhaustive audit of `taal_earthquakes_2021_2024.json` (USGS FDSN catalog) reveals:
- **Total events:** 49
- **Shallow events ($\le 15$ km):** Exactly **1 event** (13 Oct 2023, depth 10.0 km, M5.0).
- **Deep events ($> 15$ km):** **48 events** (98.0% of catalog). Depths range from **47.44 km to 233.96 km**.

#### Scientific Cause
The USGS global seismograph network (FDSN) is insensitive to local volcanic micro-seismicity ($M < 3.0$, depth $< 10$ km) in the Philippines. Almost all events in the USGS catalog are intermediate-depth Wadati-Benioff zone earthquakes associated with the subducting South China Sea Plate along the Manila Trench.

#### Deep Clamping Flattening Artifact
In `VolcanoScene.tsx` line 370:
```typescript
const displayDepth = Math.min(35, q.depth_km)
const y = -displayDepth
```
Because all 48 subduction events have actual depths $\ge 47.44\text{ km}$, **all 48 events are clamped to 35 km depth**.
When the user selects "Subduction (>15 km)", 48 spheres are plotted at the exact same depth ($y = -35$), creating an artificial horizontal shelf.
Furthermore, caption Line 801 claims:
`"Subsurface spheres show USGS FDSN catalog context (depth 1-35 km below vent...)"`
This misrepresents earthquakes at 100–234 km depth as having occurred between 1 and 35 km!

**Recommended Fix:**
1. In caption / UI documentation, disclose that USGS catalog reflects regional intermediate subduction events (depths 47–234 km), clamped to -35 km display floor for close-up visibility.
2. Note that local volcanic conduit micro-seismicity (0–15 km) is recorded by PHIVOLCS TVN / WOVOdat, not the USGS global catalog.

### 4.2 Magnitude Scaling Formula
Line 372 computes visual sphere radius:
$$\text{radius} = \max\left(0.2, (M - 1.5) \times 0.25\right)$$
- For $M = 2.0$: $\text{radius} = 0.2$ (floor)
- For $M = 4.0$: $\text{radius} = 0.625$
- For $M = 6.2$: $\text{radius} = 1.175$
This is an illustrative linear visual scaling rather than an energy scaling ($E \propto 10^{1.5 M}$) or rupture length scaling ($L \propto 10^{0.5 M}$). This illustrative role is acceptable, but caption should specify it is an illustrative display radius.

---

## 5. Scientific Boundary Disclosures & Non-Validation Rules (Task 4)

The codebase strictly maintains boundary disclosures:
1. `frontend/src/scientificScope.ts`:
   - Explicitly designates Taal as "Scientific focus... historical agreement is not established".
   - Mayon and Kanlaon are strictly designated as "Teaching illustration only. No historical reference event is curated for this volcano."
   - The word "validated" is strictly avoided across scope notices.
2. `HistoricalReferences.tsx`:
   - Line 83: "Published quantities are reference evidence, not a computed historical validation."
   - Line 102: Badge labeled "Reference evidence · non-model".
   - Line 105: "They are decoupled from the Gaussian ash dispersion solver."
3. `VolcanoScene.tsx`:
   - Lines 801–805: Every single Taal reference layer carries the explicit statement:
     `"Contextual reference overlay - not a computed result of the ash model."`
   - Line 771: "Geographic terrain · ash uses flat model ground".
   - Line 775: "Billows and fountains are schematic... Cloud edges, opacity and vertical billow shape are artistic, not a CFD solution."

---

## 6. SI Units & Mass Accounting Consistency (Task 5)

| Quantity | Variable Name | Contract / Reference Units | Validation Status |
|---|---|---|---|
| Emission Mass Rate | `mass_rate_kg_s` | $\text{kg/s}$ | Verified |
| Eruption Duration | `duration_s` | $\text{s}$ | Verified |
| Total Erupted Mass | $M = \dot{m} \Delta t$ | $\text{kg}$ | Strictly conserved in `contracts.py` |
| Deposition Load | `load_kg_m2` | $\text{kg/m}^2$ | Verified in `kernel.grid_load()` |
| Bulk Deposit Density | `bulk_density_kg_m3` | $\text{kg/m}^3$ | Verified |
| Deposit Thickness | `thickness_mm` | $\text{mm} = \frac{\text{load}}{\rho} \times 1000$ | Verified in `kernel.exposure()` |
| Daily $\text{SO}_2$ Flux | `so2_t_day` | $\text{metric tonnes/day}$ ($1\text{ t/day} \approx 0.01157\text{ kg/s}$) | Verified in activity log & timeline |
| Plume Height | `plume_height_m` | $\text{m above vent}$ | Verified in timeline & references |
| Aviation Altimeter | FL160, FL330, FL490, FL650 | $\text{Pressure altitude (hundreds of feet MSL)}$ | Shifted by vent elevation (QA-TAAL-07) |

---

## 7. Concrete Evidence: Test Fixture Execution

The independent test fixture `qa/taal_review/test_taal_data_audit.py` was executed using uv:
```powershell
uv run --project backend python -m pytest qa/taal_review/test_taal_data_audit.py
```

### Execution Results
```
============================= test session starts =============================
platform win32 -- Python 3.12.15, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\Michael\CS-Abo\ABO-CS-1
plugins: anyio-4.15.1
collected 22 items

qa\taal_review\test_taal_data_audit.py ......................            [100%]

============================= 22 passed in 1.46s ==============================
```

### Full Repository Regression Gate
```powershell
uv run --project backend python -m pytest backend/tests qa
```
Result: **191 passed in 5.23s** (0 failures).

---

## 8. Recommendations for Implementation Owners

1. **Fix Dike Vector Direction in `VolcanoScene.tsx` (L460):**
   Change:
   ```typescript
   const dir = new THREE.Vector3(Math.sin(rad), 0, Math.cos(rad)).normalize()
   ```
   To:
   ```typescript
   const dir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize()
   ```
2. **Clarify Seismicity Depth Clamping in `VolcanoScene.tsx`:**
   Update the inspection card and caption note to clarify that USGS catalog events are deep regional subduction events (depths 47–234 km) clamped to 35 km for scene display.
3. **Harmonize TROPOMI Caption in `VolcanoScene.tsx` (L805):**
   Update wording to reflect transport heading towards 45° NE from wind origin 225° SW.
4. **Update `sync_frontend_public()` in `scripts/curate_taal_context.py`:**
   Add `"taal_hdx_damage_proxy_metadata.json"` to the `public_files` list so future curation runs automatically update `frontend/public/`.
