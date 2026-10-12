# Two-agent QA and corrections — 12 October 2026

Two independent evaluators reviewed the current application and research; the orchestrator applied corrections and integrated evidence. Both reviewers completed their correction retests. This completes the scoped review, not empirical eruption validation.

## Plan and ownership

1. Scientific QA checks sources, equations, input evidence, numerical/API boundaries and the actual manuscript.
2. Application QA checks the served production UI, 3D/map timing, completed-result exports, historical disclosures and mobile presentation.
3. The orchestrator fixes confirmed defects, regenerates contracts, rebuilds the manuscript and runs integration checks. Evaluators independently retest their findings without changing implementation.

The reviewers own `CURRENT_SCIENCE_QA.md`, `CURRENT_APP_QA.md` and their attributed `qa/current_review/science-*`, `app-*` artifacts. The orchestrator owns implementation, curation, manuscript and this integration record. No additional agents were spawned.

## Corrected findings

| Finding | Correction | Retest |
| --- | --- | --- |
| Custom receptors could count 2024 population in a 2020 request | `service.prepare` applies census selection to catalog and custom receptors across simulation, sweep and eruption sequence. Explicit selected-year records, including null, take precedence; a matching inline census is accepted otherwise. Missing selected-year data remains unknown. Facilities retain valid population/year metadata without contributing to municipal totals. | 22 independent scientific/API cases, plus the existing suite |
| The visible clock obscured discrete map versus smooth 3D timing | The hour-only label now identifies the map snapshot. Visible replay text explains interpolation; the guide distinguishes the map inspector from eventual table/CSV quantities. No intermediate quantitative result is invented. | Independent current-build browser retest |
| Windows curation corrupted units, date ranges and names | Explicit UTF-8 source reads replace platform defaults. Catalog, inventory and parameter register were rebuilt; the derived inventory hash and dataset revision were updated. | Independent recursive catalog comparison: 13 text changes, no numeric/type/key/length changes; live symbols correct |
| Manuscript benchmark scope could be read as current-renderer certification | Updated IMRaD paper dates the previous benchmark, separates the revised renderer, describes current corrections and records 164 Python / 61 frontend checks and 27.9 h settling horizon. | Independent actual-DOCX audit and all 16 Word-rendered pages |

The suspected rectangular cloud artifact was rejected using the Before-stage counterexample: the gray band is the documented neutral plane outside the DEM. It remains a display limitation rather than a demonstrated shader defect.

## Current evidence

- Full Python suite: **164 passed**, including 22 new independent cases discovered by the standard `pytest backend/tests qa` command.
- Frontend: **61 passed**; ESLint, TypeScript, production build and regenerated-contract comparison pass.
- Ruff lint/format pass with the explicit backend configuration.
- Independent browser checks cover Taal, Mayon/lava, stages, map modes, stale-result JSON, historical status and 320 px dark layout. The final retest uses `index-CzstAtRQ.js` and catalog `2026-10-12-gap-evidence-v2-utf8`; no console errors were observed.
- Live production API reproduces the saved Mayon request: 37 frames, 1 h emission, 27.909722 h final horizon, 36,000,000 kg emitted, 30,459,336.28543452 kg inside, 5,540,663.714565478 kg outside and zero still aloft. The historical route remains unavailable with no invented metrics.
- Actual Microsoft Word 16.0 build 20326 renders the revised DOCX read-only into 16 pages. All 162 prose/table paragraphs appear; Arial 11 pt body / 12 pt headings, seven editable equations, three tables and three figures pass independent checks. Every replacement page has independent visual review.

Current DOCX SHA-256: `666ce8604ed6acfad35730b9c8330e613b421bd9ba170da2f99c54180ae2da3a`. Current actual-Word PDF SHA-256: `b2931607b35b7c88d9eaa15b9a616724b9474d27481b33d9fa8bd3b8bc64226f`. Any replacement invalidates this review.

Proof and reproducible fixtures are in `qa/current_review/`. [Scientific review](CURRENT_SCIENCE_QA.md) and [application review](CURRENT_APP_QA.md) identify attribution, sources and limits. The PDF and page images are internal evidence; the editable DOCX is the manuscript deliverable.

## Remaining gates

Historical prediction remains **source blocked**. Accepted plume-level winds, independent ash mass, bulk density, emitted grains, historical active-vent datum, independent deposit observations and defensible tolerances are still required. The frozen 75% wind-coverage gate is not relaxed; available soundings cover 71.43%. The two digitizations share one published source and are not independent eruption observations.

Administrative coverage, historical populations, damage criteria and water facilities remain incomplete. Local release-height convergence is unestablished. The retained model excludes wind shear, rainfall, aggregation and terrain interception for ash; the lava model excludes cooling, branching and ponding. Plume shape, fountaining, texture and cooling colors are illustrations.

Current-renderer matched-settings performance, resource-cleanup attribution/soak, an actual hidden-page transition, native 200% zoom, screen-reader speech and Word's native accessibility checker remain open. This review does not convert earlier scoped checks into those passes. [Gap register](GAP_REGISTER.md) retains the full evidence history.
