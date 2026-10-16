# Comprehensive QA, 15 October 2026

Reviewed base commit `dc13dbe` and the corrective working tree on Windows, Python 3.12 through uv 0.11.7, Node 25.9.0/npm 11.19.0. One independent science/backend evaluator assisted the orchestrator; the evaluator authored counterexamples and the orchestrator applied production corrections. No commit or push was performed.

## Outcome

The confirmed numerical, boundary-validation, source-presentation and camera cleanup defects were corrected. This is a scoped software QA pass with explicit scientific and engineering gates still open. Historical predictive accuracy is not established.

## Corrections

| Area | Root cause and correction |
| --- | --- |
| Pulse accounting | Sequence emission used the average source rate. Sum the actual clipped pulse emissions; airborne parcels use each component's pulse start, duration, height, rate and wind. Column rise uses the active pulse height and relative start, and gaps have no active column. |
| Profile sweep | The sweep ignored enabled profile winds. Rotate the entire component profile over 360 one-degree reference bearings; retain relative shear. Selecting a result rotates the editable profile too. |
| Resource bounds | A full 360-direction temporary rejected default catalog sweeps. Service orchestration now uses at most 16 directions per vectorized kernel batch, preserving the 512 MiB admission estimate and loop-free computational kernel. |
| Wind comparison | Editing uniform wind fields left the profile active, making comparison inputs ineffective. Comparison explicitly clears profile winds and discloses this behavior. |
| API boundary | Malformed blocked-input strings, null reference tables, parameter objects, criteria and observation group objects could reach React consumers. Validate consumed shapes before rendering and preserve the actionable error path. |
| Camera cleanup | Three r186 looks up the canvas root at disposal; detached canvases return themselves instead of their original document. Preserve the original event root during disposal. A real ten-cycle browser check retains one document keydown listener and one canvas. |
| Curation | Missing USGS CSV previously created invented representative events attributed to USGS. It now raises without output. Curation and OpenAPI export explicitly use LF for reproducible Windows/Linux bytes. |
| Source claims | Bato's primary paper reports a 21 × 8 km dike, not 5 km. Correct length/width with page/hash metadata; label 225° and display placement schematic. Withhold unsupported uplift/subsidence and TROPOMI numbers. Mark draft activity/timeline/network/HDX records source-blocked and prevent their presentation as reviewed observations. PDZ geometry is attributed to its OSM shoreline approximation, not official hazard GIS. |

Primary-source review and independent reproduction are in [QA_SCIENCE_20261015.md](QA_SCIENCE_20261015.md). Archived draft evidence is retained with its review status; it is not silently promoted into validated input.

## Verification

- Locked installs: documented `scripts/setup.ps1` completed backend locked sync and `npm ci`; npm reported zero dependency vulnerabilities. Baseline checks passed 191 Python and 93 frontend tests.
- Corrected Python: Ruff lint and format checks pass; full `pytest backend/tests qa` passes 210 tests, including independent numerical and curation regressions.
- Corrected frontend: `npm run api:types`, ESLint, TypeScript, 99 Vitest tests and production build pass. Generated OpenAPI/types have no semantic diff from the authoritative contracts. The 982 kB scene chunk retains a build size warning.
- Independent evaluator: 19 focused regressions pass, including scalar 360-angle sheared-profile expectations, per-frame mass and parcel balance, pulse-relative columns, batch bounds, coverage, and exact temporary-directory curation reconstruction. Hashes prove byte identity, not empirical truth.
- Real headed Chromium, production FastAPI serving at loopback port 8066: default Taal simulation and finite sequence, shared submitted scenario, pause/seek/replay, final integration, stale notice, injected network failure with retained results, all-320-receptor sweep, unavailable historical evaluation, CSV/JSON downloads, keyboard scenario selection, and Mayon ash/lava workflow exercised.
- Browser resilience: profile sweep/result application, two actual uniform-wind comparison requests, ten mount/unmount cycles, reduced-motion change, real WebGL context loss and retry all pass. Retry stays paused and exposure remains available. Paused GL sample: zero draws over one second. Foreground sample: 59.43 browser callbacks/s over 2.2 seconds, visible and focused; this is not a sustained renderer benchmark.
- Light/dark screenshots at 1440×1000 and 320×900 were captured. Neither narrow theme has horizontal document overflow; desktop-dark and mobile-light screenshots were visually inspected for hierarchy, readable content and overflow. Browser artifacts/scripts/results are under `output/playwright/qa-20261015/`.
- Manuscript unchanged: static ZIP inspection finds seven editable equations and three embedded figures; DOCX SHA256 `666ce8604ed6acfad35730b9c8330e613b421bd9ba170da2f99c54180ae2da3a`. No new Word rendering or accessibility certification is claimed.

## Remaining gates

- Historical agreement, independent source inputs, complete administrative/population coverage and local release-height convergence remain unestablished as documented in the gap register.
- Exact source artifacts for the blocked contextual datasets still need review. Disabled alert/Sentinel controls and unavailable activity bookmarks are deliberate truthful states.
- Switching another browser tab to the foreground still left `document.hidden=false`; an actual hidden-page pause is not certified. Mocked lifecycle tests are separate evidence.
- No fresh 30-minute soak, heap/GPU retention audit, sustained multi-device performance test, native screen-reader/Word accessibility review, exhaustive control audit or all-page manuscript review was completed in this run.
- Build chunk-size and Three.Clock deprecation warnings remain. Expected injected network/context-loss events are distinguished from ordinary runtime errors.

Anti-slop scope: PASS for preserving the blue identity and ENERGY 2/RHYTHM 2/MOTION 2, user-controlled motion, explicit academic/source labels, real calculation/download actions, and sampled narrow/theme layouts. This scoped review does not certify every possible visual state or native accessibility behavior.
