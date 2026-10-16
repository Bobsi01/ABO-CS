# QA Audit Report: Expanded Regional Ashfall Visualization & Provincial Exposure

**Date:** 2026-10-16  
**Auditors:** Independent Scientific QA Specialist & Independent UI/Map/Accessibility QA Specialist  
**Target Capabilities:** Literature-scale regional ashfall scenario (`taal-regional`), provincial/regional receptor attribution, dual-tier trace contouring, municipal choropleth & provincial boundaries, historical 2020 footprint overlay, and `ProvincialExposureExplorer`.  
**Overall Gate Status:** **PASSED** (All 214 backend pytest tests, 111 frontend vitest tests, TypeScript compilation, ESLint, Ruff checks, and WCAG AA contrast gates verified).

---

## 1. Executive Summary

This QA report documents the end-to-end verification of the expanded ashfall visualization architecture. In response to requirements for modeling realistic regional footprints that extend beyond proximal vents across Luzon, the system has been upgraded to:
1. Support literature-scale regional eruption scenarios (17 km column, 10-hour duration, 1.5×10⁶ kg/s mass rate, 300 km computational domain, and fine distal grain classes) based on the 12–13 January 2020 Taal eruptive episode (Balangue-Tarriela et al., 2022).
2. Attribute all 320 receptors with official Philippine Standard Geographic Code (PSGC) `province` and `region` identifiers.
3. Deliver distal trace contouring (0.01 mm and 0.1 mm) alongside standard quantitative hazard isopachs (≥0.5 mm) with explicit visual and semantic separation.
4. Render lightweight, self-contained GeoJSON administrative layers: municipal choropleth polygons (365 features), provincial boundary outlines (24 provinces), permanent province centroid labels, and digitized 2020 literature footprint boundaries.
5. Provide a hierarchical `ProvincialExposureExplorer` with 4 impact KPI cards, threshold toggles, severity tier classifications, and click-to-locate map synchronization.

Automated verification confirmed zero regressions across existing contract gates, census consistency checks, and visual boundary controls. A high-priority contrast defect identified during the dark-theme audit was remediated and verified.

---

## 2. Test Execution & Build Verification Matrix

| Suite / Gate | Command / Tool | Status | Results & Metrics |
| :--- | :--- | :--- | :--- |
| **Backend Test Suite** | `uv run --project backend python -m pytest backend/tests qa` | **PASS** | **214 passed** in 5.43s (including `test_expanded_visualization.py` and `test_gap_evidence.py`). |
| **Backend Code Hygiene** | `uv run --project backend ruff check --config backend/pyproject.toml backend scripts qa` | **PASS** | 0 errors, 0 warnings across all 57 backend/script files. |
| **Backend Code Formatting** | `uv run --project backend ruff format --check --config backend/pyproject.toml backend scripts qa` | **PASS** | 57 files verified formatted without modification. |
| **Frontend Test Suite** | `npm.cmd run test` (Vitest in `frontend/`) | **PASS** | **111 passed** across 21 test files in 6.73s. |
| **Provincial Explorer Unit Tests** | `provincialExposureExplorer.test.tsx` | **PASS** | 3 tests passed (KPI rendering, trace/standard filtering, locate integration). |
| **Frontend Type Checking** | `npm.cmd run typecheck` (`tsc --noEmit`) | **PASS** | 0 TypeScript type errors. |
| **Frontend Linter** | `npm.cmd run lint` (`eslint .`) | **PASS** | 0 ESLint errors/warnings. |
| **Vite Production Build** | `npm.cmd run build` | **PASS** | Built client bundle cleanly in 345 ms (GeographicMap: 15.86 kB, index: 306.49 kB). |

---

## 3. Scientific and Numerical QA Findings

### 3.1 Backend Contracts & Schema Integrity (`backend/src/abo_api/contracts.py`)
- **Province & Region Attribution:** `Receptor` schema incorporates optional `province: str | None = None` and `region: str | None = None` attributes.
- **Contract Inheritance:** `ReceptorResult` and `SweepReceptor` cleanly inherit these attributes without schema drift.
- **Physical SI Units:** Strict preservation of SI units:
  - Column height: meters ($m$)
  - Mass eruption rate: kilograms per second ($kg/s$)
  - Duration: seconds ($s$)
  - Atmospheric pressure: Pascals ($Pa$)
  - Ash thickness: millimeters ($mm$)
  - Ground deposit load: kilograms per square meter ($kg/m^2$)
- **Pydantic Validation:** Type constraints, non-negative bounds, and coordinate ranges validated via strict Pydantic models.

### 3.2 Distal Trace Contours (`backend/src/abo_api/service.py`)
- **Contour Threshold Expansion:** Contour generation expanded to include distal trace thresholds:
  $$\text{Levels: } [0.01, 0.1, 0.5, 1.0, 5.0, 10.0, 50.0, 100.0]\text{ mm}$$
- **Numerical Mass Conservation:** Mass conservation across the discrete integration domain verified down to machine precision. Trace thresholds correctly capture the low-density tail of fine ash particles ($\phi \ge 3.5$) transported >100 km downwind without altering proximal mass balances.

### 3.3 Literature-Scale Regional Scenario (`taal-regional`)
- **Source Provenance:** Calibrated to published field observations from the 12–13 January 2020 Taal phreatomagmatic-to-subplinian phase (Balangue-Tarriela et al., 2022; PHIVOLCS eruptive episode bulletins).
- **Physical Parameters:**
  - Plume Column Height: $17,000\text{ m}$ (17 km asl)
  - Eruption Duration: $36,000\text{ s}$ (10 hours)
  - Mass Eruption Rate (MER): $1.5 \times 10^6\text{ kg/s}$
  - Total Erupted Mass: $M_0 = 5.4 \times 10^{10}\text{ kg}$ (~$0.02\text{ km}^3$ DRE at $2,600\text{ kg/m}^3$)
  - Grid Domain: $300\text{ km} \times 300\text{ km}$ ($201 \times 201$ nodes at $1.5\text{ km}$ resolution)
- **Total Grain Size Distribution (TGSD):**
  - $\phi = -2$ ($4\text{ mm}$): $0.10$
  - $\phi = 0$ ($1\text{ mm}$): $0.20$
  - $\phi = 2$ ($250\ \mu\text{m}$): $0.30$
  - $\phi = 3.5$ ($90\ \mu\text{m}$): $0.25$
  - $\phi = 5$ ($31\ \mu\text{m}$): $0.15$
  - Fractions sum: $\sum f_i = 1.000$ (exact).
- **Academic & Operational Disclaimers:** Explicitly marked with academic disclosures:
  > *"Illustrative literature-scale teaching scenario based on published field parameters from the 12–13 Jan 2020 Taal eruptive episode (Balangue-Tarriela et al., 2022). Illustrative teaching model; does not constitute operational hazard warning or aviation advisories."*

### 3.4 Municipal Receptor Catalog Census Integrity
- **Receptor Count Gate:** Preserved exactly 320 receptors in `data/catalog.json` (318 municipalities + 2 international airports), strictly preserving the census baseline tested in `qa/test_gap_evidence.py`.
- **Administrative Mapping:** All 320 receptors successfully mapped to official PSGC provinces (`Batangas`, `Cavite`, `Laguna`, `Rizal`, `Quezon`, `Metro Manila`, etc.) and regions (`Region IV-A (CALABARZON)`, `National Capital Region (NCR)`, `Region III (Central Luzon)`, etc.).

---

## 4. UI, Map & Accessibility QA Findings

### 4.1 Map Architecture & Layer Toggles (`GeographicMap.tsx`)
- **Semantic Layer Controls:** Layer toggles encapsulated in a semantic button group (`role="group" aria-label="Map visual layer toggles"`).
- **Interactive Layers:**
  1. *Provinces:* Toggles provincial border vector strokes (`#475569`, weight 1.5, dashed) and permanent uppercase centroid tags.
  2. *Municipal areas:* Toggles 365 municipal boundary polygons with dynamic deposit fill shading (`depositColor`), thickness opacity, and click-to-select.
  3. *City labels:* Toggles floating pill centroid badges (`${name} · ${thickness} mm`) with `pointer-events: none` to ensure smooth map interactions.
  4. *Jan 2020 Footprint:* Contextually rendered for Taal volcano; overlays the digitized $0.5\text{ mm}$ field isopach in purple dashed styling (`#7c3aed`).

### 4.2 Distal Trace vs. Quantitative Contours
- **Visual Separation:**
  - *Standard Quantitative Contours ($\ge 0.5\text{ mm}$):* Rendered with dark structural under-casing (`#3c4038`, weight 5, opacity 0.95) and solid deposit colors (`depositColor()`, weight 3).
  - *Distal Trace Contours ($0.01\text{ mm}$ and $0.1\text{ mm}$):* Rendered with amber dashed lines (`#ca8a04` and `#eab308`, weight 2, `dashArray: '5 4'`).
- **Semantic Distinction:** Tooltips explicitly denote *"distal trace ash contour (visible dusting/air quality threshold)"* versus *"accumulated ash contour"*, preventing unwarranted civil panic or conflation with structural loading thresholds.

### 4.3 Provincial Exposure Explorer (`ProvincialExposureExplorer.tsx`)
- **Impact KPI Cards:**
  1. *Provinces Affected:* Dynamic count of provinces exceeding threshold.
  2. *Localities Affected:* Count of municipalities exceeding threshold.
  3. *Peak Modeled Ash:* Maximum thickness with locality and province attribution.
  4. *Indicative Families:* Household exposure estimated using the official PSA 2020 CPH CALABARZON average household size divisor ($4.1$ persons/household).
- **Threshold Mode Filter:** Accessible toggle button group (`aria-pressed`) switching between:
  - *Trace Footprint ($\ge 0.01\text{ mm}$):* Displays full regional dusting footprint (CALABARZON, Metro Manila, and Central Luzon).
  - *Standard Cutoff ($\ge 0.5\text{ mm}$):* Filters strictly to measurable ground accumulation.
- **Accordion Hierarchy:** Collapsible province cards sorted descending by peak modeled thickness. Each header acts as an accessible `<button>` with `aria-expanded` and animated chevrons.
- **Severity Tiers:** Classified into 5 distinct non-alarmist color badges:
  - *Heavy:* $\ge 10\text{ mm}$
  - *Moderate:* $1\text{–}10\text{ mm}$
  - *Light:* $0.5\text{–}1\text{ mm}$
  - *Trace:* $0.01\text{–}0.5\text{ mm}$
  - *None:* $< 0.01\text{ mm}$
- **Click-to-Locate:** Integrates directly with Leaflet `panTo({ animate: false })`, centering and highlighting the selected locality on the map.

---

## 5. Accessibility, Theming & Contrast Audit

### 5.1 Color Contrast Evaluation (WCAG 2.2 AA Minimum: 4.5:1 text, 3:1 non-text/large)

| Interface Element & State | Text Color | Background Color | Contrast Ratio | Evaluation |
| :--- | :--- | :--- | :--- | :--- |
| Primary text (Light theme) | `#142b49` | `#ffffff` | **14.27:1** | PASS (AAA) |
| Secondary text (Light theme) | `#4b607b` | `#ffffff` | **6.45:1** | PASS (AA) |
| Action button (Light theme) | `#ffffff` | `#195cc2` | **6.27:1** | PASS (AA) |
| Primary text (Dark theme) | `#edf4ff` | `#14243a` | **14.13:1** | PASS (AAA) |
| Secondary text (Dark theme) | `#afc2dd` | `#14243a` | **8.62:1** | PASS (AAA) |
| Active filter button (Light) | `#ffffff` | `#195cc2` | **6.27:1** | PASS (AA) |
| **Active filter button (Dark, Before)** | `#ffffff` | `#9ac5ff` | **1.78:1** | **FAIL** (Defect) |
| **Active filter button (Dark, After)** | `#102544` | `#9ac5ff` | **8.62:1** | **PASS (AAA)** |
| Province label tag (Light) | `#1e293b` | `rgba(255,255,255,0.85)` | **14.63:1** | PASS (AAA) |
| Province label tag (Dark) | `#f1f5f9` | `rgba(15,23,42,0.85)` | **16.30:1** | PASS (AAA) |
| City map badge value (Light) | `#195cc2` | `rgba(255,255,255,0.92)` | **6.27:1** | PASS (AA) |
| City map badge value (Dark) | `#60a5fa` | `rgba(15,23,42,0.92)` | **7.02:1** | PASS (AAA) |
| Locate button text (Light) | `#195cc2` | `#ffffff` | **6.27:1** | PASS (AA) |
| Locate button text (Dark) | `#9ac5ff` | `#14243a` | **8.61:1** | PASS (AAA) |
| Severity Badge: Heavy ($\ge 10\text{ mm}$) | `#7f1d1d` | `#fee2e2` | **8.11:1** | PASS (AAA) |
| Severity Badge: Moderate ($1\text{–}10\text{ mm}$) | `#9a3412` | `#ffedd5` | **6.37:1** | PASS (AA) |
| Severity Badge: Light ($0.5\text{–}1\text{ mm}$) | `#854d0e` | `#fef9c3` | **6.41:1** | PASS (AA) |
| Severity Badge: Trace ($0.01\text{–}0.5\text{ mm}$) | `#713f12` | `#fef08a` | **7.50:1** | PASS (AAA) |
| Severity Badge: None ($< 0.01\text{ mm}$) | `#475569` | `#f1f5f9` | **6.89:1** | PASS (AA) |

### 5.2 Remediations Applied
1. **Dark Theme Filter Button Contrast:** Updated `.filter-button-group button.active-filter` to use `color: var(--action-text);`. In dark theme, `--action-text` evaluates to `#102544`, achieving **8.62:1** contrast on the `#9ac5ff` background.
2. **Keyboard Navigation Polish:** Added `.map-toggle-pill:focus-within { outline: 2px solid var(--action); outline-offset: 1px; }` ensuring clear focus rings when tabbing through map controls.
3. **Vestibular Protection & Reduced Motion:** Added `@media (prefers-reduced-motion: reduce) { .province-card { transition: none; } }` and enforced `{ animate: false }` across all programmatic map pans.

---

## 6. Retained Limitations & Boundary Disclosures

In compliance with repository primary directives (`AGENTS.md` and `PROJECT_CONTEXT.md`):
1. **Centroid-Point Sampling:** Deposit thickness values are evaluated at discrete municipal centroid points. Although the municipal choropleth displays the full administrative boundary polygon, the shaded value represents the centroid sample. Terrain elevations, ridge crests, and peripheral micro-climates within the same municipality may experience localized variation.
2. **Simplified Analytical Dispersion:** The simulation uses an analytical Gaussian advection-diffusion kernel with settled grain-size classes and steady wind vectors. It does not incorporate complex 3D wind shear, topography-plume deflection, or secondary cloud umbrella expansion.
3. **Indicative Demographic Multipliers:** Household counts are derived using the CALABARZON regional average household divisor of 4.1 persons (PSA 2020 CPH). Sub-provincial variations in family density are indicative approximations intended for relative exposure comparison rather than emergency muster tabulations.
4. **Historical Footprint Reference:** The 12–13 Jan 2020 footprint is an illustrative digitized reference (0.5 mm isopach from Balangue-Tarriela et al., 2022) with a digitized error bound of ~554 m. It is provided for educational orientation and spatial scale comparison, not operational backcasting.
5. **No Airborne Aviation Advisory:** Surface deposit calculations and trace ground contours do not model flight-level ash column concentrations or airborne airspace hazard corridors.

---

## 7. Sign-off & Acceptance Recommendation

All primary requirements have been implemented and comprehensively audited:
- [x] Literature-scale regional scenario implemented (`taal-regional`, 17 km, 10 hr, 5.4×10¹⁰ kg mass).
- [x] All 320 receptors enriched with PSGC province and region attributes.
- [x] Trace contours (0.01 mm, 0.1 mm) rendered with dashed styling distinct from hazard isopachs.
- [x] GeoJSON municipal boundaries (365), provincial boundaries (24), and Jan 2020 footprint rendered.
- [x] Provincial Exposure Explorer component with KPIs, accordions, and filtering active and tested.
- [x] Dark-theme contrast defect remediated and verified (8.62:1).
- [x] 214 backend tests and 111 frontend tests fully passing.

**Acceptance Status:** Ready for integration and user review.
