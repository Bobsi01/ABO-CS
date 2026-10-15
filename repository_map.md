# ABO repository map

## Contributor entry points

Taal multi-parameter review (14 October): `docs/TAAL_QA_DELIVERY.md` is the integrated evidence record. `qa/taal_review/SCIENCE_QA_REPORT.md`, `UI_A11Y_QA_REPORT.md`, and `GRAPHICS_3D_QA_REPORT.md` are the independent reports from the three authorized specialists. `qa/taal_review/test_taal_data_audit.py` runs in pytest; `frontend/src/taalUiA11y.test.tsx` and `frontend/src/components/volcanoScene3DQA.test.tsx` run in Vitest. Earlier milestones and evidence below remain dated history.

Paths are relative to the repository root. Dated ownership below records previous implementation milestones; new contributors assign ownership for their own change.

| Path | Purpose |
| --- | --- |
| `CONTRIBUTING.md`, `AGENTS.md` | Portable setup, checks and working instructions |
| `skills/README.md`, `docs/SKILLS.md`, `antislop.md` | Skill routing, provenance and core filter |
| `backend/` | Python contracts, numerical engine, local API and tests |
| `frontend/` | React workspace, geographic 3D/map, generated types and tests |
| `data/` | Curated catalog, example scenarios, archived public evidence and manifests |
| `docs/README.md` | Documentation reading order and current-versus-historical records |
| `qa/README.md`, `qa/package.json`, `qa/package-lock.json` | Independent cases, retained evidence and optional portable browser tools |
| `qa/browser/playwright-runtime.cjs` | Browser dependency resolution without author-specific paths |
| `scripts/` | Setup, startup, explicit curation and manuscript/contract generation |
| `.github/workflows/ci.yml` | Linux locked-install verification on pushes and pull requests |
| `docs/REPOSITORY_HANDOFF.md` | GitHub scope, Git LFS, source rights and reproducibility boundaries |
| `frontend/src/components/eruptionVisuals.ts`, `eruptionVisuals.test.ts` | Cloud texture, sparse ash markers, surface lava ribbon and geometry/data-boundary checks |
| `docs/3D_VISUAL_REVISION.md`, `qa/browser/3d-visual-2026-10-12-*` | Current renderer revision, visual evidence and remaining QA gates |
| `docs/TAAL_IMPLEMENTATION_PLAN.md` | Implementation roadmap based on TAAL_FOCUS_QA_AND_DATA.md, with 13 October user decisions and status |
| `docs/TAAL_QA_DELIVERY.md` | 14 October multi-agent QA delivery, integrated findings, corrections, and test evidence |
| `qa/taal_review/` | Independent QA reports (science, UI/a11y, 3D graphics) and test_taal_data_audit.py |
| `frontend/src/taalUiA11y.test.tsx` | Independent Vitest accessibility, anti-slop, and contrast test suite (15 tests) |
| `frontend/src/components/volcanoScene3DQA.test.tsx` | Independent 3D graphics lifecycle, disposal, camera preset, and 3D population simulation test suite (17 tests) |
| `frontend/src/scientificScope.ts`, `scientificScope.test.ts` | Taal scientific-focus and Mayon/Kanlaon teaching-illustration wording (no validation claim) |
| `data/source/taal-activity/` | 13 October post-2020 Taal source attempts; blocked or mismatched, no values curated |

## QA gap closure — 2026-10-11

During this milestone, the scientific specialist owns backend source/tests, scientific curation scripts and data; the engineering specialist owns frontend implementation/tests and its browser helpers; independent QA owns `qa/gap_closure/` and its report. The orchestrator owns generated contracts, integration documentation and the manuscript. These assignments supersede overlapping historical ownership rows below.

| Path | Responsibility |
| --- | --- |
| `docs/EVALUATION_PROTOCOL.md` | Scientific owner: frozen Taal interval, processing, split, dependency and tolerance rules |
| `data/source/igra/` | Scientific owner: archived Tanay records, NOAA format and reviewed processing results |
| `data/source/taal-study/` | Scientific owner: publisher/NIH evidence and explicit rejected-download records |
| `data/source/domain-inventory.json` | Scientific owner: included, unresolved and omitted domain records |
| `qa/gap_closure/`, `docs/GAP_CLOSURE_INDEPENDENT_QA.md` | Independent evaluator: source, scalar, inventory, contract, browser and manuscript evidence |
| `frontend/public/qa-baseline.html` | Engineering owner: isolated animation/WebGL pacing diagnostic |
| `qa/browser/gap-engineering-*`, `docs/ENGINEERING_GAP_EVIDENCE.md` | Engineering owner: real browser timings, injected failures and lifecycle evidence |
| `scripts/build_research_figures.py`, `docs/figures/` | Orchestrator: archived wind evidence and explicitly synthetic sensitivity figures |
| `qa/render_research_word.ps1`, `qa/research/word/` | Orchestrator: actual Microsoft Word read-only rendering and page/content evidence |
| `qa/browser/gap-final-retest.cjs`, `summarize_gap_performance.py`, `gap-iab-*`, `gap-performance-summary.json` | Orchestrator: final browser case reruns, completed-context exports, raw in-app timings and sampled-foreground evidence |
| `docs/GAP_REGISTER.md`, `docs/GAP_CLOSURE_DELIVERY.md` | Orchestrator: consolidated status, provenance, verification and retained evidence limits |

## Current implementation paths — recovered 2026-10-10

| Path | Owner / responsibility |
| --- | --- |
| `backend/src/abo_api/contracts.py` | Backend: Python input/output contract authority |
| `backend/src/abo_api/kernel.py` | Backend: vectorized fallout, point samples, projection, sweep |
| `backend/src/abo_api/service.py` | Backend: catalog, screening, contours, historical metrics, provenance |
| `backend/src/abo_api/evidence.py` | Scientific owner: wind vector averaging, coverage, datum conversion, grouped splits and interval metrics |
| `backend/src/abo_api/eruption.py` | Backend and orchestrator: finite-source ash snapshots, plume parcels, fountain geometry, raw-DEM lava routing and timed footprints |
| `backend/tests/test_eruption_sequence.py`, `qa/test_eruption_audit.py` | Orchestrator and independent QA: timed footprint regression and scalar-reference eruption audit |
| `backend/src/abo_api/main.py` | Backend: API, resource admission, local docs and built UI serving |
| `backend/tests/` | Backend: numerical and API regressions |
| `frontend/src/Workspace.tsx` | Frontend: shared workspace, controls, workflows, exports |
| `frontend/src/components/VolcanoScene.tsx` | Frontend: R3F scientific illustration with instanced subsurface seismicity (with depth stratum filter), PDZ boundary, dike vector, alert ring, TROPOMI plume cue, Tagaytay/cross-wind camera presets, and aviation flight-level altimeter |
| `frontend/src/components/EruptionEffects.tsx`, `eruptionReplay.ts`, `eruptionReplay.test.ts` | Frontend: batched billows, fountain fragments, timed lava front and backend-coordinate interpolation |
| `frontend/src/components/EruptionTimeline.tsx`, `eruptionResearch.ts` | Orchestrator: one shared sequence clock, replay controls, and curated Taal historical activity bookmarks (2021–2024) |
| `frontend/src/components/Icon.tsx` | Frontend: local SVG navigation/action icons with shared sizing |
| `frontend/src/components/Select.tsx`, `Select.test.tsx` | Orchestrator: themed keyboard-accessible single-select and viewport placement checks |
| `frontend/src/components/TerrainBackdrop.tsx`, `terrain.ts`, `terrain.test.ts` | Frontend: source-traced terrain mesh, datum/origin checks, display sampling and labeled Taal close-up relief |
| `frontend/src/components/settlingReplay.ts`, `settlingReplay.test.ts` | Frontend: common physical clock interpolation of Python paths |
| `frontend/src/components/GeographicMap.tsx` | Frontend: Leaflet map and offline fallback |
| `frontend/src/components/HistoricalReferences.tsx`, `Legend.tsx` | Frontend: references, quantitative legend, and curated Taal multi-parameter evidence panels (unrest log, WOVOdat, HDX/ARIA) |
| `frontend/src/components/ScientificViewBoundary.tsx` | Orchestrator recovery: isolate renderer/lazy-view failures from controls and completed results |
| `frontend/src/components/rendererLifecycle.ts`, `rendererLifecycle.test.ts` | Engineering: retired-renderer wrappers and shared graphics-resource lifetime |
| `frontend/src/components/leafletAccessibility.ts`, `leafletAccessibility.test.ts` | Engineering: decorative vector paths and equivalent accessible map/table workflows |
| `frontend/src/api/simulator.ts`, `presentation.ts` | Frontend: runtime validation and display helpers |
| `frontend/src/api/schema.d.ts`, `frontend/openapi.json` | Orchestrator: generated backend contracts |
| `frontend/public/offline-coastline.geojson` | Orchestrator: Natural Earth display fallback |
| `frontend/public/terrain/`, `frontend/public/geography-context.geojson` | Orchestrator: bundled geographic elevation/land/lake display assets |
| `scripts/curate_terrain.py`, `data/source/terrain/manifest.json` | Backend agent: explicit static curation, hashes and offline asset checks |
| `docs/GEOGRAPHY_REFERENCES.md` | Backend agent: picture references, terrain datum, licenses and geographic uncertainty |
| `qa/audit_terrain.py`, `qa/presentation_audit.mjs` | Independent QA: cached-source reproduction and common-clock checks |
| `data/catalog.json`, `data/examples/`, `data/source/` | Orchestrator: curated inputs, teaching scenarios, source snapshots |
| `data/examples/mayon-eruption-request.json` | Orchestrator: reproducible finite-duration ash/lava teaching request with explicit assumed values |
| `scripts/build_catalog.py`, `curate_reference_assets.py` | Orchestrator: explicit curation/reproduction |
| `scripts/curate_gap_inputs.py`, `curate_taal_contours.py`, `build_parameter_register.py`, `export_gap_evidence.py` | Scientific owner: archived wind/inventory curation, frozen contour transforms, evidence-register documentation and reproducible historical evidence export |
| `scripts/curate_taal_context.py`, `data/source/taal/` | Scientific owner: offline static curation of Taal open-source catalog (USGS seismicity CSV/JSON, PHIVOLCS PDZ, GVP/PHIVOLCS activity & timeline, InSAR deformation, Sentinel-5P TROPOMI, WOVOdat, HDX damage proxy metadata) |
| `docs/PARAMETER_REGISTER.md`, `docs/EVALUATION_PROTOCOL.md` | Scientific owner: classified input evidence and frozen retrospective methods |
| `docs/SCIENTIFIC_GAP_CLOSURE.md` | Scientific owner: final curation, numerical/API checks, investigation outcomes and retained source/model limits |
| `scripts/setup.ps1`, `start.ps1` | Orchestrator: locked Windows installation and single-port startup |
| `docs/COMPUTATION.md` | Backend: equations, worked example and implementation trace |
| `docs/3D_ILLUSTRATION.md` | Frontend: schematic forms, backend-to-scene mapping, controls and resource lifecycle |
| `docs/INPUT_VALUES.md`, `VALIDATION.md`, `DEMONSTRATION.md` | Orchestrator: values, evidence record and classroom sequence |
| `docs/ERUPTION_MODEL.md`, `ERUPTION_RESEARCH.md`, `ERUPTION_QA.md` | Backend/orchestrator/QA: equations, research applicability, defaults and scoped evidence for the eruption extension |
| `docs/IMPLEMENTATION_STATUS.md` | Orchestrator: delivered milestones and explicitly open scientific gates |
| `docs/UI_REVIEW.md` | Orchestrator: blue palette, redundancy decisions and current browser evidence |
| `docs/IMPLEMENTATION_QA.md`, `qa/` | Independent QA: numerical/data checks and skill findings |
| `qa/test_further_scientific_qa.py`, `docs/FURTHER_SCIENTIFIC_QA.md` | Further scientific QA agent: 26 independent cases, reproduced defects and primary-source review |
| `frontend/src/furtherQA.test.tsx`, `frontend/src/components/furtherSceneQA.test.tsx`, `docs/FURTHER_UI_QA.md` | Further UI QA agent: four regression/counterexample cases, independent Chrome workflows and image review |
| `docs/FURTHER_QA.md`, `qa/browser/further-*` | Orchestrator: nine-finding integration record, final checks and browser screenshots with attribution |
| `docs/ABO_RESEARCH_IMRAD.md`, `ABO_RESEARCH_IMRAD.docx` | Orchestrator: source manuscript and editable Word IMRaD research, Arial 11 pt body / 12 pt headings |
| `scripts/build_research_document.py` | Orchestrator: manuscript-to-DOCX generation, native equations and exact typography audit |
| `qa/render_research_document.py`, `audit_research_document.py`, `qa/research/` | Orchestrator: internal actual-DOCX rendering, font/content checks and final page-review evidence |
| `docs/RESEARCH_DOCUMENT_QA.md` | Orchestrator: research trace, reproducible document commands and renderer/evaluation limitations |
| `docs/RESEARCH_INDEPENDENT_QA.md`, `qa/research/independent-*` | Research QA agent: independent manuscript/style/source review, scalar reproduction and initial/final artifact evidence |

The Stage 0 table below is archived preparation history. No planned-module status below overrides the current paths above. `frontend/src/App.tsx` is the retained unused foundation; `main.tsx` imports the current workspace.

## Archived Stage 0 map

Start with `PROJECT_CONTEXT.md` for the proposal, `docs/ARCHITECTURE.md` for engineering decisions, and `AGENTS.md` for working rules. This map is the bounded search entry point; update it when paths change.

| Path | Responsibility | Current state |
| --- | --- | --- |
| `PROJECT_CONTEXT.md` | Source-grounded scope, constraints, acceptance criteria, and unresolved questions | Preparation |
| `docs/source/PROJECT_PROPOSAL.md` | Snapshot of the supplied Google Docs tab and revision | Reference |
| `docs/ARCHITECTURE.md` | Python + React boundaries, units, proposed contracts, delivery order | Preparation |
| `docs/DEVELOPMENT.md` | Windows setup, commands, and troubleshooting | Preparation |
| `docs/SKILLS.md` | Selected skill provenance, triggers, and evidence limits | Preparation |
| `docs/QA_REPORT.md` | Independent skill assessment and foundation validation evidence | QA-owned |
| `AGENTS.md` | Repository instructions and skill routing | Active |
| `DESIGN.md` | Pending product direction and documented draft-starter choices | Draft |
| `antislop.md` | Locally gathered anti-slop core | Active |
| `skills/antislop-ui/SKILL.md` | Locally gathered visual filter | Active |
| `skills/abo-numerical-modeling/SKILL.md` | ABO-specific scientific modeling workflow | Active |
| `skills/abo-python-react/SKILL.md` | Backend/frontend implementation boundaries | Active |
| `skills/abo-qa/SKILL.md` | Scientific, integration, and UI evidence checks | Active |
| `backend/pyproject.toml`, `backend/uv.lock` | Python dependencies and reproducible environment | Foundation |
| `backend/src/abo_api/main.py` | FastAPI application and health contract | Foundation |
| `backend/tests/` | Backend contract tests; future numerical tests | Foundation |
| `frontend/package.json`, `frontend/package-lock.json` | React, TypeScript, Vite, and quality tooling | Foundation |
| `frontend/.npmrc` | Enforce the frontend toolchain's supported Node engines | Foundation |
| `frontend/src/` | React entry, typed health client, and starter UI | Foundation |
| `frontend/src/api/schema.d.ts` | Generated OpenAPI types from the Python application | Foundation |
| `scripts/export_openapi.py` | Export the actual backend schema for frontend type generation | Foundation |
| `data/README.md` | Manual-input provenance and review policy | Data intentionally empty |
| `.github/workflows/ci.yml` | Reproducible backend/frontend checks | Foundation |

Former planned responsibilities are implemented at the current paths above. Historical scientific agreement remains unavailable even though its evaluation interface is implemented.
