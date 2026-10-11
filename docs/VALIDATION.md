# Validation evidence

## Current gap-closure evidence — 11 October 2026

The current integration passes 142 Python / 56 frontend cases, lint, formatting, generated contracts, types and build. Independent source/scalar/inventory audits and the frozen protocol are recorded in [GAP_CLOSURE_INDEPENDENT_QA.md](GAP_CLOSURE_INDEPENDENT_QA.md). Final production browser failures, completed-request exports and matched-settings sampled-foreground replay results are in [ENGINEERING_GAP_EVIDENCE.md](ENGINEERING_GAP_EVIDENCE.md). Actual Word formatting/content and orchestrator visual review are in [RESEARCH_DOCUMENT_QA.md](RESEARCH_DOCUMENT_QA.md).

Historical validation is not established. The 30-minute soak completed but resource growth remains unresolved; actual hidden-page, native browser zoom, speech accessibility and independent final integration/page checks remain unestablished. [GAP_REGISTER.md](GAP_REGISTER.md) distinguishes these gates from numerical correctness and source availability. Earlier dated evidence below is preserved as history and does not supersede this revision.

## Earlier verification records

Further two-agent QA, 2026-10-10: **107 Python cases / 47 frontend tests** pass, with full lint, formatting, type checking, unchanged generated contracts and production build. Nine findings were corrected, with 26 new independent scientific cases and four UI counterexamples/regressions. The evaluators independently retested eight corrections; the orchestrator verified the final compass correction after the UI evaluator reported it. Final-build in-app replay measured 60 fps; a separate Chrome session measured 1 fps with an unresolved pacing cause. Fresh final screenshots and attribution are in [FURTHER_QA.md](FURTHER_QA.md); the two independent reports retain research/graphics evidence limits. This supersedes earlier counts and does not close historical or calibrated-value gates.

Latest eruption extension, 2026-10-10: **81 Python cases and 43 frontend tests** pass, with Ruff, formatting, generated-contract reproduction and production build. The new finite-source ash model has scalar-reference/conservation evidence; the separate lava teaching model now uses inclined segment distance for travel time and volume. Actual timeline/map/camera/export flows, both themes and 320 px layout were checked by the orchestrator. Replay measured 45 fps in the recorded browser run. [ERUPTION_QA.md](ERUPTION_QA.md) identifies test authorship, corrected reference expectations, screenshots and all evidence limits. This supersedes older counts below; historical agreement and calibrated physical values remain unmet.

Latest Taal visibility refinement on 2026-10-10: frontend lint/types/build and **34 tests** pass. Source/water preservation and true-scale regional switching are covered; actual desktop and 320 px IAB inspection confirms a larger, visible crater with labeled 6× local relief. The impact map is unchanged when switching camera modes. Packaged terrain checks still pass; numerical physics and source datasets were not changed. See `UI_REVIEW.md` for scoped evidence and screenshots. This supersedes earlier frontend counts below, while historical/physical-input gates remain open.

Recorded 2026-10-09 and recovered 2026-10-10 on Windows, Python 3.12.13. Numerical correctness, application behavior and historical agreement are separate claims. The solver status is implemented; historical status is not validated.

The later 2026-10-10 blue-palette/interface revision is recorded in `UI_REVIEW.md`, including current contrast checks, redundancy changes, responsive screenshots and verified in-app assets. Older presentation observations below describe their dated builds.

## Latest geographic completion — 2026-10-10

This section supersedes older test counts below. Backend CI commands from `backend/` pass Ruff, formatting and **58 Python cases** (27 implementation and 31 independent). Frontend `npm run check` passes lint, types, **32 tests** and production build. Generated OpenAPI/TypeScript contracts reproduce with identical hashes. Independent replay arithmetic passes nine additional assertions. Numerical equations and contracts remain unchanged by the terrain/UI revision.

Independent curation checks compare all 121 included population/code pairs and recompute their centroids. Geographic display checks verify **17 cached-source hashes, four output hashes and 15 independently interpolated elevation samples**, with maximum 0.049381 m rounding difference. Cached OpenStreetMap Taal Lake geometry reconstructs with seven native island holes and zero symmetric difference from the packaged map shape. All 3,775 sampled source-water positions match the terrain mask and declared historical display surface. These checks establish reproduction of the selected sources; they do not certify present-day topography, shoreline, hydrology or terrain-aware ash physics. Details and primary picture links are in `GEOGRAPHY_REFERENCES.md`.

The actual in-app browser rendered all three geographic volcanoes beside their local impact maps, both themes and a 320 px stacked layout. Selected Tanauan values match map/table; a manual higher-rate Mayon demonstration produces a visible footprint without inventing damage criteria. Replay restart, camera/reset, map fit, stale-result retention, custom selectors, manual wind comparison, 360-direction sweep and historical unavailable status were exercised. Geographic replay observed 42–45 fps recent windows; earlier playback recorded 60 fps. Browser evidence, saved screenshots and remaining graphics/MapTiler limits are in `UI_REVIEW.md`; independent findings are in `IMPLEMENTATION_QA.md`.

The Taal study's title and 2022-03-02 publication date were corrected against the publisher. Catalog revision is `2026-10-10-curation-2`. The study's principal plume/volume facts were rechecked; fresh Table 3 extraction was unavailable, so its earlier transcription is not presented as newly reverified. The study's area discrepancy remains visible.

**Scientific status remains unchanged:** the physical teaching defaults are illustrative; reviewed effective seasonal/event winds, eruption/grain/dispersion/density inputs, condition-specific damage criteria, historical populations and independent geolocated evaluation observations remain missing. No historical-validation success is claimed.

## Numerical and contract evidence

`uv run --project backend pytest backend/tests qa` passed **56 cases**: 25 implementation tests and 31 independent cases. Independent scalar normal-density and `math.erf` cell-integral expectations exercise the public API, rather than reusing solver functions. Cases cover zero mass, calm/cardinal wind, multiple grains and release layers, exact mass accounting, projection round trips, sensitivity, threshold equality, outside-domain unknowns, duplicate identifiers/population unions, resource limits, sweep-selected simulation agreement and malformed/nonfinite requests. Historical metric code is tested with clearly synthetic held-out observations and optional polygons; this is not Taal evidence.

Ruff lint and formatting, generated OpenAPI/TypeScript, frontend lint/typecheck and **18 frontend tests** pass in the final recovery check, independently repeated by QA. A production build succeeds. Three.js/Fiber produce a roughly 942 kB minified lazy 3D chunk (249 kB gzip); Vite reports its size warning. This is a packaging limitation, not a failed build. The build is split from the main application.

Independent synthetic API benchmark: 40,000 cells, three grains and sixteen layers, 0.747 s wall time with instrumentation; about 5.3 MB traced Python/NumPy allocations. This is not total process RSS or GPU evidence. See `qa/benchmark.py` and `IMPLEMENTATION_QA.md`.

## Input evidence

`qa/audit_data.py` independently compares **all 121 included PSGC/population pairs** to transcribed primary PSA provincial tables, finding no discrepancies. All 121 polygon centroids recompute within 0.0000005 degree rounding. Three source snapshot SHA-256 hashes match; source IDs and receptor IDs are consistent. The name-to-boundary jurisdiction crosswalk and scientific applicability require continued review. Inventory is partial: Batangas 34, Cavite 16, Albay 18, Negros Occidental 29, Negros Oriental 24, plus two airport points.

Live catalog simulations return 200 for all three illustrative presets, with 200 × 200 cells. Covered receptor counts are Taal 51, Mayon 19, Kanlaon 41 out of 123. Catalog, sweep and historical-reference endpoints also return 200. Taal references return unavailable, with blockers and two published reference tables, rather than fabricated metrics.

## Browser evidence — orchestrator

Chrome at 1440 × 765 rendered actual WebGL2 geometry, backend trajectories and deposit colors. Run, camera close-up/reset, play/pause, geographic coastline/contours, parameter stale status and subsequent run, manual two-wind comparison, 360-direction sweep, selecting a maximum direction, source help and historical unavailable state were exercised. Taal sweep direction 29 degrees for San Nicolas produced 0.5106053762645236 mm and one reported municipality, indicative population 24,392; the CSV retained that value/year/status. JSON download retained the submitted scenario and provenance. Files were downloaded locally and read back; the browser download-event helper timed out despite a successful CSV download.

Dark/light themes and a 320 × 800 viewport were inspected. The narrow viewport reported document width 305 px within a 320 px viewport, with parameter disclosure and wrapping controls. Screenshots are in `qa/browser/`. Configured foreground/background contrast checks exceed required text ratios; these do not constitute complete WCAG certification.

The initial replay displayed 1 fps, including after its paused-time measurement was corrected. After task recovery, a full rebuild/reload with batched receptor markers and an explicit active animation loop measured **59 rendered fps and 59 native browser animation callbacks per second** over the recent two-second window. This meets the 30 fps target in that run, not on every device or every browser state. Development hardware: AMD Ryzen 7 5800U with Radeon integrated graphics, driver 30.0.13032.4000. The earlier slow browser pacing is retained as evidence; its cause was not established. Pixel density is capped at 1.5, drops to 1 on slow rendering, and a manual reduced-detail control is available.

Recovery also exercised a real stopped server: Run reported a network failure while the completed Taal result and Tanauan selection remained visible. Restarting the same local server and rerunning recovered without reloading the workspace. Network errors now explain the startup command and retry action. A view error boundary contains renderer/lazy-import failures so controls and the completed result table remain usable; this is covered by a regression test. Rebuilding while an old tab is open can invalidate its lazy asset URLs, so reload after a build.

The recovered backend specialist fixed a Windows path-separator issue in static serving. Live `/api`, `/api/`, `/api/missing`, `/api/missing.json` and `/missing.js` now return 404; `/` and `/workspace` return the application. The exported scenario, replayed through the strict request's scenario field, reproduces the grid, receptor records and provenance exactly.

The final build also completed Mayon and Kanlaon runs in Chrome, including 19 and 41 in-domain receptors respectively. The expanded grain legend displayed five distinct class paths with diameter, submitted speed and backend falling times of 50,000, 12,500, 3,125, 833.33 and 250 seconds for the teaching inputs. Kanlaon replay reported 60 fps in a recent two-second window. Final screenshots are `qa/browser/final-mayon-3d.jpg` and `qa/browser/final-kanlaon-3d.jpg`.

WebGL fallback, runtime context-loss containment, hidden/reduced-motion pause and listener cleanup have regression tests using a mocked renderer, plus source-level disposal review. Actual WebGL loss, OS reduced-motion changes, long-duration GPU memory stability and MapTiler credentialed tile operation are not yet browser-certified. The optional map needs a user-provided public origin-restricted key; offline display is verified with no key.

## Unmet scientific gates

The curated physical defaults remain illustrative. Reviewed effective seasonal winds, eruption/grain/dispersion/density inputs, condition-specific roof/crop criteria, water-facility criteria/coordinates, historical 2020 populations and independent geolocated Taal observations are absent. The published 0.5 mm footprint area discrepancy is preserved. Historical accuracy cannot be inferred from numerical tests or map appearance. See `INPUT_VALUES.md` for every required value.

The runtime software and numerical model are delivered as a learning implementation. The plan's complete reviewed-data and historical-agreement milestones remain open. CI is configured, but no remote CI run or deployment is claimed.
