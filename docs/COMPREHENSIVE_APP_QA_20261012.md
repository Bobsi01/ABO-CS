# Comprehensive independent application QA, 12 October 2026

The evaluator reviewed the cloned ABO-CS checkout at baseline commit `b46f13f866e82412937a080a2e46443d10bea4f1`. The independent evaluator owns only new scripts, evidence under `qa/comprehensive_20261012/app/`, and this report; the root agent owns corrections. No historical report, screenshot or implementation was overwritten.

This review uses the ABO QA, Python/React and local anti-slop skills. Their requirements to inspect actual browser workflows, trace shared computed results, preserve completed results and distinguish graphics evidence from numerical checks guided the cases below. The existing blue workbench and ENERGY 2 / RHYTHM 2 / MOTION 2 direction were applied as review criteria. No new aesthetic direction was invented.

## Findings and reproductions

| Severity | Finding | Reproduction and consequence | Status |
| --- | --- | --- | --- |
| P1 | Bundled wind sweep rejected its resource estimate | Load the default Taal teaching scenario, choose **Wind sweep**, then **Evaluate all wind directions**. The baseline API returns `Estimated working memory exceeds the 512 MiB computation budget`; no direction rows appear. Independently confirmed in browser as well as by the science evaluator. The root agent corrected resource accounting/batching. | Closed: independent fresh-build workflow retest |
| P2 | Incomplete API response validation could blank the entire workspace | Intercept an otherwise valid local catalog response with `criteria: null`, then run a simulation. The catalog passes the runtime boundary; `Workspace.tsx:230` calls `catalog.criteria.find` and crashes. Five further malformed evidence-field cases below also pass the boundary and crash the root UI. The intended behavior is a useful version/response error before committing malformed data to React. This is a synthetic failure/recovery fixture, not a claim of hostile data in the bundled catalog. | Closed: all six independent corruption fixtures rejected on fresh build |
| P2 | Retired camera controls retained detached canvases through document key listeners | Repeated **Guide & sources** → **Simulation** remounts retain retired OrbitControls and canvases after the 3D view disappears. Three's `connect()` registers on the live canvas's document root; `disconnect()` later calls `getRootNode()` on an already detached canvas and removes from the wrong target. Forced-GC counts grow; the heap path is document listener → bound OrbitControls → retired canvas. | Closed for attributed listener/retired-canvas defect: fresh-build metrics and heap retest |

The runtime-validation finding is rooted in `frontend/src/api/simulator.ts` (`evidenceValid`, `historicalDetailsValid`, and the catalog response branch). The focused corruption matrix confirms these consumed invalid shapes:

| Injected shape | Trigger | Failing consumer |
| --- | --- | --- |
| `catalog.criteria = null` | Run a real simulation | `Workspace.tsx:230`, `.find` on null |
| `catalog.historical.blocked_inputs = "unexpected string"` | Open **Taal 2020** | `HistoricalReferences.tsx:3`, `.map` on string |
| `catalog.historical.reference_tables = [null]` | Open **Taal 2020** | `HistoricalReferences.tsx:5`, `.title` on null |
| `catalog.parameter_evidence[0].value = { unknown: 1 }` | **Guide & sources**, expand **Parameter evidence register** | `EvidenceDetails.tsx:8`, invalid React object child |
| `replication.observation_results[0].spatial_group = { invalid: "object" }` | Check the intercepted historical response | `HistoricalEvaluation.tsx:26`, invalid React object child |
| `replication.observation_results[0].dependency_group = { invalid: "object" }` | Check the intercepted historical response | `HistoricalEvaluation.tsx:26`, invalid React object child |

Every crash leaves zero `.application` nodes, preventing controls, error recovery and exports until reload. Evidence: `baseline-report.json`, `baseline-catalog-contracts.json`, `baseline-expanded-catalog-contracts.json`, and their screenshots. The observation rows are explicitly synthetic and are not scientific observations.

## Browser evidence

The baseline production app was served locally at `http://127.0.0.1:8012`, with entry asset `index-CzstAtRQ.js`. Browser: installed Google Chrome `154.0.8037.99`; mode: headless; primary viewport: 1440 × 1000, with real 320 × 900 viewport tests. Browser scripts resolve the separately locked QA Playwright runtime. These runs do not certify foreground GPU performance.

`workflows.cjs` records the following real application cases:

- Default Taal submits matching scenario, screening and census context to the Python grid and finite-duration sequence endpoints. The returned scenarios agree; 37 frames are available; replay starts paused.
- Before/During/After and keyboard range seeks select computed map snapshots; the final map's reported-centroid count matches the final Python frame. Interpolated 3D and discrete map timing are explicitly distinguished in the visible note and slider description.
- Keyboard location selection, CSV row count and exported scenario agree with Python. Final CSV has 320 receptor rows in this dataset. Eventual table/CSV meaning is preserved separately from selected-time map values.
- Draft edits retain completed wind captions and exports. Injected HTTP 503 and malformed grid failures preserve the completed sequence and permit a normal recovery run.
- Native invalid-input handling opens a folded invalid density field, states the field-specific reason and focuses it.
- Invalid manual comparison has an actionable error. Two valid manual winds compute separately; inspecting one shows its completed 45° wind and removes the unrelated sequence timeline.
- Mayon enables its lava teaching model, produces seven route points, allows ash/lava map selection and extent/reset controls, and retains the stated prescribed-width/illustrative limitations. Camera selectors and reset work.
- Draft edits and an actual `prefers-reduced-motion` media transition pause replay.
- Both themes at 320 px have 320 px document/client/scroll width. The eventual table scrolls internally; keyboard camera selection remains usable.
- Eight scene/map unmount/remount cycles leave one rendered canvas and one Leaflet map each time without JS errors. This is DOM behavior evidence, not retained GPU-object cleanup proof.
- A synthetic `webglcontextlost` event pauses playback, preserves map/slider/scenario export and permits explicit **Retry 3D** recovery. It is not a native graphics-driver failure test.
- Catalog network failure exposes an actionable retry; retry restores runnable inputs.

`resilience.cjs` independently records asynchronous draft editing, cancellation/retry, non-JSON response retention, terrain/geography HTTP 404 fallback and recovery, keyboard skip-link activation, Escape disclosure closure, and keyboard-focusable/named canvas with a visible solid outline.

The opaque DOM text sample at 320 px has minimum measured contrast 5.40:1 in light and 6.20:1 in dark, with 50 sampled text nodes per theme in the corrected baseline run. The 15 sampled visible buttons per theme are at least 44 × 44 px. The test applies the project's correct 24 px regular / 18.67 px bold large-text exception. It excludes raster scenes/maps, translucent overlays, hidden elements and disabled opacity; it is not a full accessibility certification.

The reviewer inspected the actual Taal during-stage, Mayon lava-stage and both narrow-theme images. The scene/map stack and internal table scrolling remain legible; gray cloud/steam and enlarged fountain/lava remain illustrations. The previously documented abrupt outside-DEM horizon remains visible; this review does not relabel it as a newly discovered cloud-shader fault or claim final user visual acceptance.

## Harness corrections and evidence integrity

The original workflow harness prematurely asserted text inside the closed historical contour disclosure; that assertion was corrected before final retest. The original resilience harness also checked an effect-driven enabled state without waiting, and assumed the first Tab after a mouse click started at the document beginning. Neither is a reproduced project defect. The corrected baseline resilience evidence is `baseline-harness-corrected-resilience.json`; the original logs remain preserved. The skip-link test focuses the actual link and activates it with Enter, so it proves keyboard activation/destination, not a complete initial tab-order audit.

The separate keyboard-camera image comparison initially included the keyboard focus outline, which disappears after a mouse reset click. Its correction compares direct browser screenshots clipped five pixels inside the canvas boundary. ArrowLeft, ArrowUp and plus change the paused terrain image; reset restores the original image exactly. `cleanup-fixed-camera-keyboard.json` and the `camera-v2-*` screenshots record that passing check. The initial border-inclusive images remain retained and are not an application reset defect.

## Remaining evidence limits

Opening and foregrounding another tab did not produce a native hidden-document event either in headless or in one bounded **headed Chrome** attempt (`events: []`, `hidden: false`). The actual hidden-page lifecycle gate remains open; the headed attempt is recorded in `final-lifecycle.json`. A 30-minute soak, matched-settings foreground performance, native browser 200% zoom and screen-reader speech were not established here. Short remounts and text/focus checks cannot close those gates. The app still distinguishes the academic model from PHIVOLCS advice; this application QA does not establish historical predictive accuracy, source readiness, individual exposure or damage validity.

## Lifecycle attribution

`lifecycle.cjs` performs 20 actual simulation/run plus view-remount cycles on `index-CPAkKjCr.js`. With forced GC, visible DOM stays at 4,587 nodes with one canvas/map, but CDP counts rise by 1,180 event listeners, 6,342 DOM nodes and 4,079,356 bytes of used JS heap. All five paused 400 ms WebGL-draw samples remain zero and there are no page errors. This is bounded headless evidence, not a 30-minute soak or hardware performance result.

`retention-attribution.cjs` separates ten **remount-only** cycles from new computations and tests three controls: both views, map-only with the 3D lazy import deliberately denied, and scene-only with the map import deliberately denied. The settled run waits 1,500 ms before forced GC and another 250 ms before sampling; its results are in `settled-retention-attribution.json`. Map-only listener/node counts remain flat apart from two nodes; scene-only rises by 90 listeners and 1,802 nodes; both views rise by 360 listeners and 2,932 nodes. This isolates the growing slope to a live/retired scene lifecycle rather than an inherent Leaflet-map remount leak.

After the final **Guide & sources** switch, application canvas and map DOM counts are zero. Heap snapshots and compact retaining-path summaries are saved as `final-guide-unmounted.heapsnapshot`, `settled-guide-unmounted.heapsnapshot`, and `final-guide-unmounted-paths.json`. The snapshot retains eleven engine canvases from retired views. Its concrete strong path is live HTMLDocument → registered event listener → bound OrbitControls (`py` in the production chunk) → `domElement` → retired canvas. Playwright's InjectedScript happens to provide the shortest path to the same live document; the retired view is held by the application's document listener, not by a direct automation ElementHandle.

Installed `three/examples/jsm/controls/OrbitControls.js` registers the control interception listener on `this.domElement.getRootNode()` in `connect()` and re-queries that root in `disconnect()`. `Camera` in `frontend/src/components/VolcanoScene.tsx` calls `controls.dispose()` from its effect cleanup after DOM detachment. The detached canvas is now its own root, so document-level interception listeners survive. This is the attributed correction target, not a speculative renderer/shared-texture change. The snapshots are approximately 53 MB each and remain deliberate local evidence; compact path summaries support review without opening the full snapshots.

## Independent correction retests

Fresh production asset `index-CPAkKjCr.js` independently passes every main workflow and resilience check in `final-report.json` and `final-resilience.json`. The bundled sweep now returns rows and a direction can be reused. Criteria-null and all five expanded catalog/historical corruption fixtures return a useful unexpected-response error, preserve the workspace and produce no page errors; `final-catalog-contracts.json` records the expanded matrix. Historical derived-contour rendering/export is now verified after correcting the harness disclosure-order assertion. The six response-validation crashes and sweep failure are closed. Baseline failures above remain preserved historical observations.

The root corrected controls retirement through `frontend/src/components/orbitControlsLifecycle.ts`, capturing the original root and removing the locked Three r186 interception handlers even after the canvas detaches. Vendor source remains unchanged. The workaround deliberately depends on the locked runtime; three actual-installed-runtime tests cover document-root detachment, ShadowRoot detachment, control-key keyup registration and repeated attached disposal. Root integration reports 188 Python and 86 frontend cases passing, generated contract stability and the documented lint/type/build gates. Those whole-repository gates belong to the root's integration evidence; they are separate from this evaluator's browser checks.

The final independent browser reload uses `index-D9xPQGL8.js` / `VolcanoScene-mQbEhHZk.js`. All 18 workflow evidence entries pass again, six functional resilience checks pass, the seventh resilience entry records the environment's inability to produce a real hidden transition, and all six corruption variants are rejected with the workspace preserved. There are zero page errors. Evidence: `cleanup-fixed-report.json`, `cleanup-fixed-resilience.json`, `cleanup-fixed-catalog-contracts.json` and final theme/normal/recovery screenshots.

The attributed retirement correction passes these independent comparisons:

| Check | Before correction | After correction |
| --- | --- | --- |
| 20 run/remount cycles, event-listener delta after GC | +1,180 | 0 |
| 20 run/remount cycles, CDP DOM-node delta | +6,342 | +3 |
| Visible DOM / application views | 4,587 nodes, one canvas/map | Same |
| All five paused 400 ms WebGL-draw samples | Zero | Zero |
| Ten settled remount-only cycles, both/map-only/scene-only | Scene-containing cases grow | Each mode: listener delta 0, node delta +2 |
| Guide-unmounted snapshot, retained OrbitControls | Eleven controls/engine canvases rooted through document listeners | Zero controls; zero engine canvases rooted through document listeners |

The final snapshot retains three canvas wrapper/cache objects and one WebGL context, including browser prototype/cache and current-source infrastructure; these counts are not represented as eleven retired application views. The compact path summary isolates the reported application-root defect. Evidence: `cleanup-fixed-lifecycle.json`, `cleanup-fixed-retention-attribution.json`, `cleanup-fixed-guide-unmounted.heapsnapshot`, and `cleanup-fixed-guide-unmounted-paths.json`. Used JS heap still warms by approximately 2.88 MB over the 20-run sequence; disappearance of the attributed listener/canvas slope does not certify every allocation or a 30-minute soak.

All three actionable findings are closed within the recorded scope. Actual hidden-page transitions, full-duration soak/general graphics-resource certification, matched foreground performance, native zoom and screen-reader speech remain open evidence gates.
