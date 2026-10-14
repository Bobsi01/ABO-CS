# ABO - QA Validation Summary (Branch `Michael`)

**Branch:** `Michael`  
**Tracking Remote:** `origin/Michael` (`https://github.com/Bobsi01/ABO-CS/tree/Michael`)  
**Latest Commit SHA:** `4365b05824d5cba3b5cdc3a7494f52520704ee2f`  
**Date:** 13 October 2026  
**Document Context:** Comprehensive QA validation summary of all implemented features, data acquisitions, and architectural alignments across the repository and branch `Michael`.

---

## 1. Executive Summary

This document presents the full record of changes implemented on branch `Michael` based on the strategic directives in `docs/TAAL_FOCUS_QA_AND_DATA.md`. The work resolves both the core Taal scientific prioritization and the user-authorized implementation sequence for previously deferred extensions:

1. **Numerical Ash Dispersion Extensions (Exact Mass Balance & Backward-Compatible):**
   * **Vertical Wind Profiles (`wind_profile`):** Height-dependent transport wind vectors ($u_e(z), u_n(z)$) linearly interpolated component-wise between user-specified vertical levels above the vent datum. Flat endpoint extrapolation prevents runaway extrapolation. Evaluated cleanly across Einsum grid quadrature and receptor point loads.
   * **Multi-Pulse Emission Kinetics (`pulses`):** Sequential emission blocks with individualized start times, durations, column heights, and mass rates. Strict contract validation enforces that total pulse mass $\sum (\dot{M}_p \cdot \Delta t_p)$ equals scenario total mass and maximum column height matches the scenario column height. Total domain mass conservation remains mathematically exact (100.0% accounted for).
   * **Exact Baseline Compatibility:** When `wind_profile=None` and `pulses=None`, simulations evaluate to the exact legacy single-layer uniform-wind outputs.

2. **Static Local Contextual Reference Overlays (Zero Runtime Network Calls):**
   * **PHIVOLCS Permanent Danger Zone (`taal_pdz.geojson`):** Official boundary polygon of Volcano Island (TVI) extracted and simplified from high-resolution geography assets.
   * **USGS Seismicity (`taal_earthquakes_2021_2024.json`):** Curated M1.8 to M3.7 hypocenters capturing the July 2021 and March 2022 swarms under Taal with depth-dependent coloring.
   * **Activity & SO2 Log (`taal_activity_log.json`):** Curated bulletin record of 2021 - 2024 unrest events with SO2 flux (t/day), plume heights, and alert levels.
   * **InSAR Geodetic Reference (`taal_deformation_bato2021.json`):** Peer-reviewed co-eruptive dike azimuth (225 deg), length (5 km), and uplift (~1 m) from Bato et al. (2021, GRL).
   * **SHA-256 Manifest (`data/source/taal/manifest.json`):** Full cryptographic hash register and provenance citations for every static asset.

3. **Frontend Integration & Visual Separation:**
   * **Parameter Workspace:** Collapsible input section in `Workspace.tsx` allowing custom wind profile levels.
   * **Geographic Map:** Official PHIVOLCS PDZ boundary overlay in `GeographicMap.tsx` with tooltip disclaimers.
   * **Volcano 3D Scene:** Subsurface hypocenter spheres in `VolcanoScene.tsx` positioned 1 to 6 km below vent, scaled by magnitude, and colored by depth.
   * **Strict Academic Transparency:** Every reference overlay is labeled: *"Contextual reference overlay - not a computed result of the ash model."*

4. **Rigorous Two-Stack Verification:**
   * Backend: 169 Python tests passing (5 new science tests), 0 Ruff lint errors, 46 files formatted.
   * Frontend: 66 Vitest tests passing across 17 test files, 0 ESLint errors, 0 TypeScript errors, production Vite build successful.

---

## 2. Inventory of Changes by File

| File Path | Status | Diff Lines | Role & Description |
| :--- | :---: | :---: | :--- |
| `backend/src/abo_api/contracts.py` | **Modified** | +48 / -0 | Added `WindLevel` and `EruptionPulse` Pydantic models. Added scenario validation enforcing pulse mass and height consistency. |
| `backend/src/abo_api/kernel.py` | **Modified** | +55 / -2 | Added `pulse_components()` flattening pulse x grain x layer. Added `layer_winds()` interpolation. Generalized `point_load()` for per-component wind arrays. |
| `backend/src/abo_api/service.py` | **Modified** | +76 / -16 | Added `sources()` unifying component axes. Updated `prepare()`, `simulate()`, `sweep()`, and `replication()` to support profile winds and pulses. |
| `backend/src/abo_api/eruption.py` | **Modified** | +46 / -10 | Extended `cumulative_weights()` and `sequence_grids()` for pulse start times and per-component transport winds. |
| `backend/tests/test_science.py` | **Modified** | +136 / -0 | Added 5 unit tests verifying uniform wind equivalence, directional shear, single pulse equivalence, mass conservation, and eruption sequence. |
| `data/source/taal/manifest.json` | **Created** | +32 | Cryptographic SHA-256 manifest and disclaimers for all static Taal contextual reference files. |
| `data/source/taal/taal_pdz.geojson` | **Created** | +38 | GeoJSON polygon of Volcano Island PDZ (187 points). |
| `data/source/taal/taal_earthquakes_2021_2024.json` | **Created** | +108 | Curated USGS FDSN seismicity records (July 2021, March 2022 swarms). |
| `data/source/taal/taal_activity_log.json` | **Created** | +100 | Curated GVP / PHIVOLCS unrest log with SO2 flux and plume heights. |
| `data/source/taal/taal_deformation_bato2021.json` | **Created** | +12 | Curated InSAR deformation reference parameters from Bato et al. (2021). |
| `scripts/curate_taal_context.py` | **Created** | +340 | Reproducible curation script with SHA-256 generation and PEP 8 formatting. |
| `frontend/public/taal_pdz.geojson` | **Created** | +38 | Static bundled public asset for offline map rendering. |
| `frontend/public/taal_earthquakes_2021_2024.json` | **Created** | +108 | Static bundled public asset for offline 3D hypocenter rendering. |
| `frontend/openapi.json` | **Modified** | +56 / -0 | Synchronized OpenAPI schema reflecting `WindLevel`, `EruptionPulse`, and Scenario fields. |
| `frontend/src/api/schema.d.ts` | **Modified** | +30 / -0 | Regenerated TypeScript interfaces from OpenAPI contract. |
| `frontend/src/api/simulator.ts` | **Modified** | +6 / -0 | Exported types and added runtime validation for wind profiles and pulses in `scenarioValid`. |
| `frontend/src/Workspace.tsx` | **Modified** | +34 / -0 | Added collapsible Vertical Wind Profile inputs with level-by-level height, speed, and direction fields. |
| `frontend/src/components/GeographicMap.tsx` | **Modified** | +15 / -4 | Integrated local `/taal_pdz.geojson` fetching with inner lake ring fallback for PDZ reference. |
| `frontend/src/components/VolcanoScene.tsx` | **Modified** | +50 / -0 | Added `SubsurfaceSeismicity` component rendering 3D hypocenter spheres and layer toggle. |
| `docs/GAP_REGISTER.md` | **Modified** | +14 / -4 | Updated gap register recording implementation of numerical extensions and contextual layers. |
| `repository_map.md` | **Modified** | +2 / -0 | Updated repository map registering `curate_taal_context.py` and `data/source/taal/`. |

---

## 3. UI Copy & Antislop Governance Compliance

* **Hard Gate R-02 (Zero Em Dashes):** Strictly enforced across all code, UI copy, and documentation comments. Hyphens (` - `), colons, and parentheses are used exclusively.
* **Non-Model Output Transparency:** Every contextual layer is explicitly labeled:
  * In Leaflet Map: *"PHIVOLCS PDZ reference, 15 Feb 2021 - contextual reference overlay, not a computed model result."*
  * In VolcanoScene: *"Subsurface spheres show USGS FDSN catalog context (depth 1-6 km below vent, scaled by magnitude). Contextual reference overlay - not a computed result of the ash model."*
  * In Diagnostics / Provenance: *"opt-in extension beyond the proposal's assumptions"* clearly flagged in provenance outputs.

---

## 4. Test Evidence Table

| Verification Suite | Status | Execution Details |
| :--- | :---: | :--- |
| Backend Ruff Lint (`pyproject.toml`) | PASS | All checks passed across backend, scripts, and qa (0 errors) |
| Backend Ruff Format Check | PASS | 46 files verified (0 modifications needed) |
| Backend Pytest Full Suite | PASS | 169 passed in 4.38s (100% pass rate) |
| Frontend OpenAPI Contract Sync | PASS | `npm run api:types` completed with zero drift |
| Frontend ESLint | PASS | 0 errors, 0 warnings |
| Frontend TypeScript Check (`tsc --noEmit`) | PASS | Type checking passed with 0 errors |
| Frontend Vitest Suite | PASS | 66 passed across 17 test files (100% pass rate) |
| Frontend Production Build (`vite build`) | PASS | Built successfully in 473ms (0 errors) |

---

## 5. Summary of New Unit Tests

The backend suite was expanded by 5 targeted tests in `backend/tests/test_science.py`:
1. `test_wind_profile_equivalent_to_uniform_wind`: Proves bitwise and numerical equivalence between a 2-level uniform wind profile and scalar uniform wind.
2. `test_wind_profile_directional_shear`: Verifies that layer shear (ground northward vs summit eastward) shifts deposition along layer directions.
3. `test_pulses_equivalent_to_single_steady_block`: Proves that a single pulse identical to scenario parameters produces an identical deposit.
4. `test_multi_pulse_mass_conservation`: Asserts that a two-pulse scenario (120 kg/s and 80 kg/s, total 100,000 kg) conserves total mass ($M_{\text{retained}} + M_{\text{outside}} = 100,000\text{ kg}$).
5. `test_eruption_sequence_with_pulses_and_wind_profile`: Verifies that the timed eruption sequence interpolates and accumulates frames properly under both extensions.

---

## 6. Verification and Reproduction Commands

To reproduce all verification checks locally:

```powershell
# 1. Backend Linting and Formatting
uv run --project backend ruff check --config backend/pyproject.toml backend scripts qa
uv run --project backend ruff format --check --config backend/pyproject.toml backend scripts qa

# 2. Backend Automated Tests
uv run --project backend pytest backend/tests qa

# 3. Frontend Contract Regeneration and Full Validation
cd frontend
npm run api:types
npm run check
```
