# ABO — Taal Focus, QA Status & Open-Source Data Report

**Course:** CSE 103 – Computational Science | BSCS 4B  
**Date:** 12 October 2026  
**Purpose:** Professor review discussion — system QA results, improvement roadmap, and open-source Taal data catalog (2021–present)

---

## Table of Contents

1. [Current QA Status (Live Results)](#1-current-qa-status-live-results)
2. [Open Evidence Gates — What Is Still Blocked](#2-open-evidence-gates--what-is-still-blocked)
3. [Professor's Suggestion: Focus on Taal Only](#3-professors-suggestion-focus-on-taal-only)
4. [Open-Source Taal Data (2021–Present)](#4-open-source-taal-data-2021present)
   - [What Each Dataset Shows Visually in the Simulation](#41-what-each-dataset-shows-visually-in-the-simulation)
   - [Dataset 1 — USGS Earthquake Catalog](#42-dataset-1--usgs-earthquake-catalog-fdsn)
   - [Dataset 2 — SO₂ Flux & Alert Level History](#43-dataset-2--so2-flux--alert-level-history-gvp--phivolcs-bu   lletins)
   - [Dataset 3 — PHIVOLCS Permanent Danger Zone](#44-dataset-3--phivolcs-permanent-danger-zone-hazard-map)
   - [Dataset 4 — Sentinel-5P TROPOMI SO₂ Plumes](#45-dataset-4--sentinel-5p-tropomi-so2-copernicus-free)
   - [Dataset 5 — Taal Eruption Event Timeline](#46-dataset-5--taal-eruption-event-timeline-2021-2024)
   - [Dataset 6 — InSAR Ground Deformation](#47-dataset-6--insar-ground-deformation-published-research)
   - [Dataset 7 — WOVOdat / PHIVOLCS-LAVA](#48-dataset-7--wovodat--phivolcs-lava-monitoring-portal)
5. [Data Curation Priority](#5-data-curation-priority)
6. [Are the Simulations Enough? Recommended Additions](#6-are-the-simulations-enough-recommended-additions)
7. [Honest Scientific Limitations](#7-honest-scientific-limitations-for-professor)
8. [Academic Presentation Checklist](#8-academic-presentation-checklist)
9. [Data Provenance & References](#9-data-provenance--references)

---

## 1. Current QA Status (Live Results)

The following checks were run live on 12 October 2026 on this machine.

| Layer | Result | Command / Evidence |
|---|---|---|
| **Python backend tests** | ✅ **164 passed** in 6.76 s | `pytest backend/tests qa` |
| **Frontend tests (Vitest)** | ✅ **61 passed** across 16 test files | `npm run check` in `frontend/` |
| **ESLint + TypeScript** | ✅ Pass | No type errors, no lint violations |
| **Production build** | ✅ Built in 654 ms | 968 kB 3D chunk, 258 kB gzip |
| **Ruff lint + format** | ✅ Pass | Explicit `backend/pyproject.toml` config |
| **Generated type contracts** | ✅ No drift | `npm run api:types` hash stable (internal Python→TypeScript types only) |
| **Local computation mass balance** | ✅ Conserved | 36,000,000 kg emitted = inside + outside domain — verified against local Python solver |
| **IMRaD manuscript** | ✅ 16 pages | Arial 11/12 pt, 7 editable equations, DOCX SHA recorded |

### Test suite breakdown (164 Python cases)

| Test file | Cases | What it verifies |
|---|---|---|
| `test_science.py` | 24 | Core Gaussian kernel, zero mass, calm wind, cardinal bearings |
| `test_current_science.py` | 22 | Census selection, UTF-8 curation, custom receptor handling |
| `test_independent_gap_science.py` | 23 | Split leakage, interval/midpoint metrics, IoU math |
| `test_eruption_audit.py` | 22 | Finite-source mass balance, timed snapshots, lava routing |
| `test_further_scientific_qa.py` | 26 | Wind normalization, negative populations, 9 earlier findings |
| `test_independent.py` | 31 | Scalar expectations, projection round trips, resource bounds |
| `test_eruption_sequence.py` | 1 | Sequence clock, shared eruption clock preservation |
| `test_gap_evidence.py` | 12 | Historical route, protocol exposure, no invented metrics — all local FastAPI routes |
| `test_health.py` | 2 | FastAPI startup, health endpoint |
| `test_packaging.py` | 1 | Static asset serving, offline coastline |

> [!NOTE]
> Test counts demonstrate verified software behavior — not statistical eruption prediction accuracy. Historical validation is a separate, still-open gate.

---

## 2. Open Evidence Gates — What Is Still Blocked

These are the items that are **not yet scientifically completable** with currently available data.

| Gate | Status | Root cause |
|---|---|---|
| **Effective historical plume wind (Taal 2020)** | 🔴 Source blocked | Tanay soundings: 71.43% altitude coverage, below frozen 75% threshold |
| **Historical predictive validation** | 🔴 Source blocked | No independent geolocated ash thickness observations; no defensible tolerances |
| **Ash mass / bulk density / grain fractions** | 🔴 Source blocked | Cannot separate mass × density from published thickness data alone |
| **2020 populations (284 of 318 municipalities)** | 🔴 Source blocked | Only 34 Batangas municipalities have crosswalked 2020 census counts |
| **Damage criteria (roof / crop / water)** | 🔴 Source blocked | USGS qualitative only; LWUA/DENR returned HTTP 403 |
| **Actual hidden-page browser transition** | 🟡 Evaluation failed | Browser test env cannot produce `document.hidden = true` |
| **Graphics cleanup / 30-min soak** | 🟡 Evaluation failed | DOM/listener counts still rise across repeated view cycles |
| **Native zoom / screen-reader / Word a11y** | 🟡 Evaluation failed | CSS proxy only; no screen-reader or Word checker run |
| **Release-height local convergence** | 🟡 Retained limitation | 18.28% change from 16→32 layers at saved test point |
| **Current-renderer performance campaign** | 🟡 Pending | Cloud-impostor revision not yet matched-settings benchmarked |

---

## 3. Professor's Suggestion: Focus on Taal Only

### Why this is the right academic decision

The professor's recommendation to focus exclusively on **Taal** is strongly aligned with the project's evidence architecture:

1. **Taal is the only Philippine volcano with a real published ashfall footprint** — Balangue-Tarriela et al. (2022) provides the only peer-reviewed 0.05 cm isopach, which the project has double-digitized (inter-trace IoU: 0.97918).
2. **Mayon and Kanlaon have zero real event data** — both profiles use assumed illustrative inputs only.
3. **One volcano + real data + honest uncertainty = a defensible, completable academic paper.**

### Recommended scope adjustment

| Aspect | Current state | Recommended change |
|---|---|---|
| Volcano selector | 3 volcanoes (Taal, Mayon, Kanlaon) | Keep UI; mark Taal as **primary scientific case** |
| Mayon / Kanlaon | Illustrative teaching presets | Relabel clearly: *"Illustrative teaching scenario — no historical validation"* |
| Municipal inventory | 162/214 Taal-domain records | Prioritize resolving the remaining 52 unmatched Taal municipalities |
| 2020 populations | 34 Batangas municipalities | Extend to Cavite/Laguna municipalities around Taal from PSA 2020 |
| Wind data | 71.43% Tanay coverage — blocked | ERA5 reanalysis data resolves this (see Section 4) |
| Reference footprint | Two traces of 1 published source | Locate Balangue-Tarriela supplementary field data |

---

## 4. Open-Source Taal Data (2021–Present)

> [!IMPORTANT]
> **No external API calls are made by this application — ever.** The running app is fully offline after installation. All datasets listed in this section are for **one-time manual curation only**: you download them once to your computer, convert them to static JSON/GeoJSON files, and store them in `data/source/taal/`. The application then reads those local files. Nothing in the running app calls USGS, Copernicus, PHIVOLCS, or any external server at runtime. This is required by `AGENTS.md` and by the course constraint.

### 4.1 What Each Dataset Shows Visually in the Simulation

| # | Dataset | How to obtain (one-time, offline) | What it shows in the 3D scene / Leaflet map |
|---|---|---|---|
| 1 | USGS Earthquake catalog | Download CSV once via browser — no login | **Pulsing 3D spheres** positioned under Taal, colored by depth, scaled by magnitude |
| 2 | SO₂ flux + alert level log | Manual reading from GVP + PHIVOLCS bulletin PDFs | **Plume opacity** driven by real flux; **color ring** for alert level |
| 3 | PHIVOLCS Permanent Danger Zone | Download KMZ file once from PHIVOLCS GIS portal | **Red polygon** on Leaflet map; translucent disc in 3D scene |
| 4 | Sentinel-5P TROPOMI SO₂ | Download NetCDF files once from Copernicus (free account) | Real **plume direction** validates model wind arrow |
| 5 | Eruption event timeline | Manual transcription from GVP + PHIVOLCS bulletin PDFs | **Burst markers** on timeline scrubber (July 2021, March 2022, etc.) |
| 6 | InSAR ground deformation | Read reported values from Bato et al. 2021 (published paper) | **Uplift/subsidence gradient** on terrain; dike intrusion arrow |
| 7 | WOVOdat / PHIVOLCS-LAVA | Formal data request to PHIVOLCS institution | Multi-parameter charts alongside scene |

---

### 4.2 Dataset 1 — USGS Earthquake Catalog (FDSN)

**What it is:** The USGS global earthquake catalog records M0+ events near Taal. It captures the major volcanic-tectonic swarms visible from 2021–2024, including the July 2021 swarm (1,195+ quakes) and March 2022 swarm.

> [!NOTE]
> **This is a one-time offline download — not a runtime connection.** You open this URL once in your browser, save the downloaded CSV to `data/source/taal/`, and the app reads that local file. The running application never contacts USGS.

**How to download (one-time, no login required):**

Open this URL once in your browser — it immediately downloads a `.csv` file to your computer:

```
https://earthquake.usgs.gov/fdsnws/event/1/query?format=csv&starttime=2021-01-01&endtime=2024-12-31&minlatitude=13.7&maxlatitude=14.3&minlongitude=120.7&maxlongitude=121.3
```

Fields in the downloaded file: `time, latitude, longitude, depth, mag, magType, place, type`.

**Curation steps (done once, offline):**
1. Open the downloaded CSV, filter to `type=earthquake`
2. Keep columns: `time` (UTC), `latitude`, `longitude`, `depth` (km), `mag`
3. Save as `data/source/taal/taal_earthquakes_2021_2024.csv`
4. Record source URL, access date and file hash in `data/source/manifest.json`
5. The application reads this static local file — no network call ever happens at runtime

**Known limitations:**
- USGS catalog does not include PHIVOLCS micro-seismicity (very small events below M1)
- Significant swarm events are captured; individual tremors are not
- For PHIVOLCS micro-seismicity, a formal data request to PHIVOLCS is required

**What it looks like in the 3D camera view:**

Each earthquake becomes a semi-transparent sphere at its 3D position in space:
- **Shallow (0–5 km)** → red/orange spheres near the lake surface
- **Mid-depth (5–15 km)** → yellow spheres inside the edifice
- **Deep (>15 km)** → blue spheres below the caldera floor
- Magnitude controls sphere size; a M3.0 event appears clearly visible, M5+ events would pulse

The July 2021 swarm could be shown as a burst of spheres appearing progressively over the 9-day window, giving a real visual sense of the activity escalation.

---

### 4.3 Dataset 2 — SO₂ Flux & Alert Level History (GVP + PHIVOLCS Bulletins)

**What it is:** The Global Volcanism Program (Smithsonian) compiles monthly BGVN (Bulletin of the Global Volcanism Network) summaries for Taal from 2021 onward, including SO₂ flux (tonnes/day), alert levels, plume heights, and eruption type classifications.

**Where to read:**
- GVP monthly reports: https://volcano.si.edu/volcano.cfm?vn=273070
- PHIVOLCS bulletin archive: https://www.phivolcs.dost.gov.ph/taal-volcano-bulletin/
- BGVN archives (vols. 46–49, 2021–2024): https://volcano.si.edu/bgvn_archives.cfm

**Key events confirmed from GVP (manually transcribed):**

| Date | Alert Level | SO₂ (t/day) | Plume Height (m) | Event Type |
|---|---|---|---|---|
| 2021-03 | 2 | 300–2,000 | — | Ongoing post-2020 unrest |
| 2021-07-01 | 3 | 13,287 | 1,000 | Phreatomagmatic eruption |
| 2021-07-03 | 3 | 14,699 | 2,500 | Peak SO₂; vog over CALABARZON |
| 2021-07-07 | 3 | — | 300 | Grayish phreatomagmatic plume |
| 2021-07-23 | 2 | 4,763 | — | Downgraded from Alert Level 3 |
| 2021-11-15 | 2 | — | — | Phreatomagmatic bursts |
| 2022-03-26 | 3 | ~21,000+ | 2,000 | Phreatomagmatic; hot fluid upwelling |
| 2022-04-01 | 3 | declining | — | Small phreatomagmatic bursts |
| 2022-07 | 1 | low | — | Downgraded to Alert Level 1 |
| 2023-01 | 1 | low–moderate | — | High seismic tremor spike; persistent |
| 2024-04-12 | 1 | — | 2,400 | New vent, SW side of Main Crater |
| 2024 ongoing | 1 | thousands/day | — | Minor phreatic events throughout year |

**Curation steps:**
1. Read BGVN volumes 46–49 (one per year, ~12 monthly issues each)
2. Extract the Taal entries from each monthly bulletin
3. Create `data/source/taal/taal_activity_log_2021_2024.json`:

```json
[
  {
    "date": "2021-07-01",
    "alert_level": 3,
    "so2_t_day": 13287,
    "plume_height_m": 1000,
    "event_type": "phreatomagmatic",
    "source": "GVP BGVN 46:08",
    "access_date": "2026-10-12"
  }
]
```

**What it looks like in the 3D camera view:**
- **Plume billow opacity** scales with SO₂ flux: 14,699 t/day → dense dark billow; 300 t/day → thin translucent steam
- **Alert level ring** around volcano base changes color: green (AL1), yellow (AL2), orange/red (AL3)
- **Timeline scrubber** lets the user scrub through 2021–2024, watching the plume and alert ring change with real data
- The July 2021 and March 2022 peaks would be clearly visible as distinct intensification events

---

### 4.4 Dataset 3 — PHIVOLCS Permanent Danger Zone (Hazard Map)

**What it is:** PHIVOLCS maintains an official Permanent Danger Zone (PDZ) and extended hazard zone maps for Taal. The entire Volcano Island is a PDZ. There is also a 14 km High Risk Zone for the broader caldera. These are legally designated evacuation areas.

**How to access:**
- **KMZ format (Google Earth):** https://gisweb.phivolcs.dost.gov.ph/gisweb/earthquake-volcano-related-hazard-gis-information
  - Select "Volcano Hazard Maps" → Taal → download `.kmz` file
- **PDF hazard report:** https://hazardhunter.georisk.gov.ph — enter Taal coordinates (14.0106°N, 120.9975°E), download report
- **HDX shapefile:** https://data.humdata.org — search "Philippines PHIVOLCS hazard"

**Curation steps:**
1. Download the Taal KMZ file from PHIVOLCS GIS portal
2. Convert to GeoJSON using QGIS (free) or https://geojson.io (online)
3. Save as `data/source/taal/taal_pdz.geojson`
4. Verify the polygon coordinates surround Taal Volcano Island
5. Record hash, source URL, access date in manifest

**What it looks like in the simulation:**
- **Leaflet map:** red polygon labeled "PHIVOLCS Permanent Danger Zone (Taal)" — displayed as a reference layer, visually distinct from the computed ash deposit
- **3D scene:** optional translucent red disc at terrain level around the island, labeled "PDZ (PHIVOLCS, dated)"
- Critically labeled: *"This boundary is a PHIVOLCS institutional designation — not a computed output of this model."*

---

### 4.5 Dataset 4 — Sentinel-5P TROPOMI SO₂ (Copernicus, Free)

**What it is:** The Copernicus Sentinel-5P satellite carries the TROPOMI instrument, which measures atmospheric SO₂ columns globally. Daily passes over the Philippines are archived from 2018 onward. This is the **satellite-measured source** for SO₂ plume spatial extent — more accurate than bulletin estimates for plume direction.

> [!NOTE]
> **This is a one-time offline download — not a runtime connection.** You download the NetCDF files once to your computer, run a local Python script to extract the plume bearing, save the result as a static JSON file, and the app reads that local file. The running application never contacts Copernicus or ESA.

**How to download once (free account required at Copernicus):**
1. Register a free account at the Copernicus Data Space Ecosystem website
2. Use the browser tool to zoom to Taal (14.0°N, 120.99°E)
3. Filter: **Sentinel-5P** → product type **SO₂ L2** (`L2__SO2___`) → set date July 1–3, 2021
4. Download the `.nc` (NetCDF) files to your local machine
5. Run a local Python script (`xarray` or `netCDF4`) to extract SO₂ column density — offline, on your computer

**What the file contains:** A gridded array of SO₂ vertical column density (mol/m²) at ~5.5 km resolution. During the July 2021 eruption, a clear plume extending from Taal is visible.

**Curation steps (done once, offline):**
1. Download the 3–4 orbit passes covering July 1–3 2021
2. Using local Python, extract the plume centroid direction from the Taal vent
3. Measure apparent plume azimuth and length in km
4. Save the result as `data/source/taal/taal_tropomi_july2021.json`:

```json
{
  "date": "2021-07-01",
  "satellite": "Sentinel-5P TROPOMI",
  "product": "L2__SO2___",
  "plume_from_bearing_deg": 225,
  "plume_length_km": 85,
  "peak_so2_du": 112,
  "source": "Copernicus Data Space Ecosystem",
  "access_date": "2026-10-12"
}
```

5. The application reads this static local JSON — no network call ever happens at runtime

**Why this is important for the model:** The extracted plume bearing gives a **real satellite-observed transport direction** for the July 2021 event. If the model predicts the same general direction using assumed wind inputs, that is a meaningful teaching comparison — even if it cannot constitute formal validation.

**What it looks like in the 3D camera view:**
- The plume wind arrow in the scene is set to match the satellite-observed bearing
- A label reads: *"Wind direction cross-checked against Sentinel-5P plume (July 2021)"*
- This is the most powerful single data addition for visual scientific credibility

---

### 4.6 Dataset 5 — Taal Eruption Event Timeline (2021–2024)

**What it is:** A manually curated chronological log of the significant Taal eruption events since 2021, compiled from GVP and PHIVOLCS bulletins. This is not a separate downloadable file — it is produced by reading the bulletin archives and transcribing key events.

**Complete confirmed event list:**

| Date | Event | Duration | Peak Plume (m) | Source |
|---|---|---|---|---|
| 2021-07-01 15:16 PHT | Phreatomagmatic eruption, dark plume | Short-lived | 1,000 | GVP BGVN 46:08 |
| 2021-07-07 05:18 PHT | Phreatomagmatic burst, grayish plume | Short-lived | 300 | GVP BGVN 46:08 |
| 2021-11-15 to 11-22 | Phreatomagmatic bursts, thermal anomalies | 7 days | — | GVP BGVN 46:12 |
| 2022-03-26 | Phreatomagmatic eruption, hot upwelling | Multi-day | 2,000 | GVP BGVN 47:04 |
| 2022-04-01 | Minor phreatomagmatic bursts | Short-lived | — | GVP BGVN 47:05 |
| 2022-10 | Minor bursts, declining activity | Brief | — | GVP BGVN 47:11 |
| 2024-04-12 | Phreatic eruption, new SW vent | — | 2,400 | PHIVOLCS bulletin |

**Curation steps:**
1. Read GVP BGVN issues: 46:07 through 49:12 (monthly, ~50 entries total)
2. Create `data/source/taal/taal_eruption_timeline_2021_2024.json`
3. Each entry: `{date_phst, event_type, plume_height_m, so2_t_day, alert_level, source}`

**What it looks like in the 3D camera view:**
- **Timeline markers:** small burst icons appear on the date scrubber at each event
- Clicking a marker **jumps the scene** to that event's parameters (SO₂, alert level, plume height)
- Visual: the eruption column brightens and darkens as the timeline passes through event peaks and quiet periods

---

### 4.7 Dataset 6 — InSAR Ground Deformation (Published Research)

**What it is:** Several published studies have already processed Sentinel-1 InSAR data for Taal and report derived deformation values. The most important for this project is:

> **Bato et al. (2021).** The 2020 eruption and large lateral dike emplacement at Taal Volcano, Philippines. *Geophysical Research Letters*, 48, e2021GL092803. https://doi.org/10.1029/2021GL092803

**Key reported values (from the paper):**
- Maximum co-eruptive ground uplift: ~1 m on Volcano Island
- Lateral dike intrusion toward Pansipit River Valley: ~5 km
- Dike azimuth: approximately SW from the main crater
- Post-eruptive subsidence continuing through 2021

**Curation steps:**
1. Access the paper (open access via AGU/Wiley or ResearchGate)
2. Read the reported deformation values from the text and supplementary material
3. Record as `data/source/taal/taal_deformation_2020_bato2021.json`:

```json
{
  "source": "Bato et al. 2021, GRL, doi:10.1029/2021GL092803",
  "period": "2020-01-12 to 2020-01-14",
  "max_uplift_cm": 100,
  "dike_azimuth_deg": 225,
  "dike_length_km": 5,
  "subsidence_continues_to": "2021",
  "note": "Derived from Sentinel-1 InSAR + GPS; not a direct field measurement of this model"
}
```

**Known limitations:** This data describes the 2020 eruption. It is used here as contextual annotation, not a simulation input or validation observation.

**What it looks like in the 3D camera view:**
- A **color gradient overlay** on the terrain around Taal island showing where land rose (warm colors) and fell (cool colors) during 2020 — labeled "Modeled deformation, Bato et al. 2021"
- A subsurface **arrow** in the 3D scene pointing SW, labeled "Lateral dike intrusion direction (Bato et al. 2021, ~5 km)"
- This adds geological depth context that the pure ash model lacks

---

### 4.8 Dataset 7 — WOVOdat / PHIVOLCS-LAVA Monitoring Portal

**What it is:** PHIVOLCS participates in WOVOdat (World Organisation of Volcano Observatories Database), which centralizes multi-parameter monitoring records including continuous GPS, tiltmeters, seismic event counts, and SO₂ DOAS time-series.

**How to access:**
- WOVOdat: https://wovodat.org (search for Taal — GVP code 273070)
- PHIVOLCS-LAVA portal: https://wovodat.phivolcs.dost.gov.ph/
- For full dataset access: formal data request through the PHIVOLCS external services form

**What's available:**
- Continuous GPS ground deformation (episodic inflation/deflation)
- Electronic tilt records
- SO₂ flux time-series from DOAS network
- Daily volcanic earthquake counts

> [!NOTE]
> Full WOVOdat catalog access typically requires a researcher account or institutional affiliation. For a student project, the PHIVOLCS external services request form may be used. The GVP monthly bulletins already synthesize the key numbers from this monitoring network.

---

## 5. Data Curation Priority

Given the project constraints (manual curation, no live APIs, Taal-focused, academic deadline), here is the recommended order:

### Tier 1 — Start immediately (5 minutes to 3 hours each)

| Action | Time | Impact |
|---|---|---|
| Download USGS earthquake CSV via browser URL | 5 min | Enables 3D seismicity visualization immediately |
| Download PHIVOLCS PDZ KMZ from PHIVOLCS GIS portal | 30 min | Adds official hazard zone to Leaflet map |
| Read GVP BGVN summaries (vols. 46–49), extract SO₂ + alert level table | 2–3 hrs | Drives real-data plume animation and timeline |

### Tier 2 — Do next (adds scientific depth)

| Action | Time | Impact |
|---|---|---|
| Register on Copernicus, download July 2021 TROPOMI SO₂ passes | 1–2 hrs | Provides real satellite-observed plume direction |
| Transcribe July 2021 and March 2022 eruption parameters from PHIVOLCS bulletins | 3–4 hrs | Enables real-event simulation presets for Taal |
| Read Bato et al. 2021, record deformation values | 1 hr | Adds geological deformation annotation layer |

### Tier 3 — For comprehensive thesis work

| Action | Time | Impact |
|---|---|---|
| Submit formal request to PHIVOLCS for seismic catalog | 1–2 weeks | Higher-resolution seismicity (micro-events below M1) |
| Process IGRA soundings for post-2021 Tanay launches | 2–4 hrs | Extends wind record for post-2020 eruption scenarios |
| Locate Balangue-Tarriela et al. 2022 supplementary data | 1 hr | Field GPS thickness observations — only real independent validation data |

---

## 6. Are the Simulations Enough? Recommended Additions

### Current simulation capabilities

| Feature | Status |
|---|---|
| Gaussian ash fallout (eventual deposit) | ✅ Analytically exact cell integration |
| Finite-emission timeline (37 snapshots) | ✅ Before/during/after, shared clock |
| 360° wind sweep (worst-case by municipality) | ✅ 1° resolution, max by receptor |
| Municipal centroid exposure screening | ✅ 318 records, conditional screening |
| 3D scene (cloud impostors, ash markers, lava ribbon) | ✅ With real terrain backdrop |
| Leaflet map (offline coastline, Taal OSM shoreline) | ✅ Offline capable |
| Mayon lava teaching model (Jeffreys flow) | ✅ Isothermal single-channel |

### Recommended additions (prioritized)

#### High priority — unlocks historical validation

**1. Height-dependent wind profile input**

Currently the model uses one uniform horizontal wind. Extending it to accept a profile:
```json
{"wind_profile": [
  {"height_m": 1000, "speed_m_s": 5.0, "from_deg": 210},
  {"height_m": 5000, "speed_m_s": 12.0, "from_deg": 225},
  {"height_m": 10000, "speed_m_s": 18.0, "from_deg": 235}
]}
```
Each release layer gets its own transport vector. The 16 release layers already exist — only the per-layer wind assignment is missing. This resolves the single largest physics simplification and allows ERA5 reanalysis data to be used directly.

**2. Multiple-pulse eruption window**

Currently one constant-emission block: `{rate_kg_s, duration_s}`.  
Extending to: `[{start_s, end_s, rate_kg_s}, ...]` lets users replicate Taal's pulsed 2020 activity.

**3. Model–observation comparison panel**

The `evidence.py` infrastructure already computes interval/midpoint residuals and RMSE. Once field thickness data is curated (from Balangue-Tarriela supplementary or PHIVOLCS reports), a panel showing modeled vs. observed points on the map with signed residuals becomes feasible.

#### Medium priority — improves scientific realism

**4. Column height uncertainty band**  
Run `column_height_low_m` and `column_height_high_m` endpoints, display the footprint envelope. Addresses "17–21 km ASL" stated uncertainty in the reference paper.

**5. Wet deposition toggle**  
Simple user-entered washout factor labeled as a teaching parameter. Relevant for Taal 2020 which had rainfall during the event.

**6. Curated Amihan / Habagat seasonal wind presets**  
From PAGASA climatological data, clearly labeled as multi-year averages not event winds. Required by the original proposal and still unmet.

#### Educational enrichment

**7. PHIVOLCS PDZ overlay on Leaflet map** — dated GeoJSON reference layer (see Dataset 3 above)  
**8. Real SO₂-driven plume opacity** — plume billow brightness tied to the curated SO₂ log  
**9. Earthquake swarm replay** — animate the USGS catalog in the 3D scene along the timeline  
**10. CSV upload for custom observation points** — client-side parsing, sent as custom receptors

---

## 7. Honest Scientific Limitations (For Professor)

These limitations are **already documented in the system** and should be clearly stated in the presentation:

| Limitation | Why it matters for Taal |
|---|---|
| Flat terrain | Taal island has significant topographic relief; terrain interception changes near-vent deposits substantially |
| No rainfall removal | The Jan 2020 eruption had concurrent rainfall; wet deposition affected measured thickness |
| Single uniform wind | Real plumes are wind-sheared by altitude; without ERA5 or IGRA, transport distance has high uncertainty |
| No pyroclastic surges or base surges | The Jan 2020 Taal event had surges — the model explicitly excludes these hazardous flows |
| Centroid sampling | Small municipalities very close to the vent may be entirely inside or outside the footprint depending only on centroid location |
| No time-varying emission | The 2020 eruption had multiple pulses; constant-emission duration is a declared simplification |
| Two digitized traces, one source | The footprint reference uses two digitizations of one published figure — these are not independent field observations |

---

## 8. Academic Presentation Checklist

Use this before presenting to your professor:

- [ ] State clearly: **164 automated tests verify the math, not the eruption** — two different claims
- [ ] Show the gap register — explicitly stating blocked gates is good science, not a weakness
- [ ] Show the two digitized contours (IoU = 0.97918) — this is a genuine source-comparison result
- [ ] State the wind coverage failure honestly: 71.43% < 75% threshold → historical wind unavailable; no data was invented
- [ ] Label all sensitivity plots as synthetic — they use assumed Mayon values, not Taal measurements
- [ ] State that Mayon and Kanlaon are teaching illustrations — Taal is the scientific focus
- [ ] Cite Balangue-Tarriela et al. 2022 prominently — it is the primary scientific reference for Taal 2020
- [ ] Do **not** claim the 3D scene appearance is evidence of model correctness — they are separate

---

## 9. Data Provenance & References

All datasets listed here require provenance records in `data/source/manifest.json` or a dedicated `data/source/taal/manifest.json` when curated. Record: publisher, URL, access date, SHA-256 hash of downloaded file, and license.

| Source | License | Notes |
|---|---|---|
| USGS Earthquake Catalog (FDSN API) | Public domain | U.S. federal government data |
| GVP BGVN bulletins | CC BY 4.0 | Cite each volume/issue |
| PHIVOLCS bulletins | Philippine government, open | Cite PHIVOLCS and access date |
| PHIVOLCS GIS Portal (KMZ) | Philippine government, open | Cite PHIVOLCS, record file version/date |
| Copernicus Sentinel-5P TROPOMI | Free for any use | Cite Copernicus/ESA and product ID |
| Bato et al. 2021 (GRL) | AGU open access | Cite DOI: 10.1029/2021GL092803 |
| HazardHunterPH / GeoRiskPH | Philippine government, public | Cite georisk.gov.ph |

### Full citation list

- Balangue-Tarriela, M. I. R., Lagmay, A. M. F., et al. (2022). Analysis of the 2020 Taal Volcano tephra fall deposits from crowdsourced information and field data. *Bulletin of Volcanology*, 84, Article 35. https://doi.org/10.1007/s00445-022-01534-y

- Bato, M. G., Pinel, V., Yan, Y., Jouanne, F., & Pathier, E. (2021). The 2020 eruption and large lateral dike emplacement at Taal Volcano, Philippines: Insights from satellite radar data. *Geophysical Research Letters*, 48, e2021GL092803. https://doi.org/10.1029/2021GL092803

- Copernicus/ESA. (n.d.). Sentinel-5P TROPOMI SO₂ Level 2 product [Data set]. https://dataspace.copernicus.eu/

- Global Volcanism Program, Smithsonian Institution. (2021–2024). *Bulletin of the Global Volcanism Network*, volumes 46–49. https://volcano.si.edu/bgvn_archives.cfm

- HazardHunterPH. (n.d.). Hazard assessment tool for the Philippines. https://hazardhunter.georisk.gov.ph

- NOAA National Centers for Environmental Information. (n.d.). Integrated Global Radiosonde Archive (IGRA), version 2.2 [Tanay station RPM00098433]. https://www.ncei.noaa.gov/products/weather-balloon/integrated-global-radiosonde-archive

- Philippine Institute of Volcanology and Seismology. (n.d.). Taal Volcano bulletins archive. https://www.phivolcs.dost.gov.ph/taal-volcano-bulletin/

- Philippine Institute of Volcanology and Seismology. (n.d.). GIS Web Portal — Earthquake and volcano-related hazard information. https://gisweb.phivolcs.dost.gov.ph/

- USGS Earthquake Hazards Program. (n.d.). FDSN Event Web Service [Data set]. https://earthquake.usgs.gov/fdsnws/event/1/

---

*This document is internal project reference material. All scientific simulation outputs are academic illustrations and are not PHIVOLCS hazard advisories. Historical eruption accuracy is not established.*
