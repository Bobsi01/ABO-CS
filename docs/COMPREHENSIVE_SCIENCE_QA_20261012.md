# Comprehensive scientific/backend QA — 12 October 2026

Independent reviewer: `science_qa`. The orchestrator owns implementation changes. This review found and independently retested one functional defect. No additional uncorrected scientific/backend defect was established in the covered cases. Numerical correctness under these cases does not establish historical eruption accuracy.

## Actionable finding and correction

**P1 — Every bundled teaching scenario's default wind sweep was rejected. Corrected and independently retested.**

The catalog now contains 320 receptors, while each bundled preset has five grains and 16 release layers. Original `service.prepare(..., sweep=True)` submitted all 360 bearings to the memory estimator. Its estimate was **595,207,680 bytes**, exceeding the **536,870,912-byte** budget. As a result, the normal Taal, Mayon and Kanlaon requests all returned HTTP 422 with `Estimated working memory exceeds the 512 MiB computation budget`. The frontend calls the sweep with the scenario and the complete default catalog, so this blocked the ordinary user workflow rather than only a pathological custom request.

Affected implementation: `backend/src/abo_api/service.py:77` and `backend/src/abo_api/kernel.py:119`. The original admission argument was `360 if sweep else 1`. The root cause was allocating/estimating the entire direction × component × receptor tensor after receptor inventory expansion.

Pre-correction evidence is [sweep_before.json](../qa/comprehensive_20261012/science/sweep_before.json). Because the orchestrator applied its fix before the persistent API capture finished, the retained reproduction explicitly loads the original kernel and service from Git HEAD **b46f13f866e82412937a080a2e46443d10bea4f1** into isolated module objects and calls those through the unchanged FastAPI route. It does not reset the checkout or present corrected source as pre-correction evidence. The initial direct source reproduction also raised the same budget error with 320 receptors.

The orchestrator now evaluates **16-bearing batches**, reduces each batch to receptor maxima and keeps a running maximum. Shared admission uses that same batch size. Strict improvement retains the lowest bearing on exact ties. The 512 MiB cap and one-degree search remain intact; components and receptors remain vectorized within each batch. Python iteration is limited to bounded bearing orchestration.

Independent correction evidence is [sweep_after.json](../qa/comprehensive_20261012/science/sweep_after.json): all three presets return HTTP 200, all 320 rows, explicit outside-domain nulls and `step_deg=1`. A separate scalar trigonometric/Gaussian oracle agrees for 320 and **2,048** synthetic receptors with **five grains × 32 layers**, the largest legal **400-cell** domain and all 360 candidate bearings. These performance fixtures intentionally repeat five coordinates under unique IDs; they do not invent real municipalities or population observations.

## Fresh coverage and successful cases

[test_comprehensive_science.py](../qa/comprehensive_20261012/science/test_comprehensive_science.py) contains **19 passing cases**, with the retained [JUnit result](../qa/comprehensive_20261012/science/pytest.xml). Expectations are scalar mathematical references rather than copied solver arrays.

| Covered area | Evidence and observed result |
| --- | --- |
| All bundled default sweeps | Taal, Mayon and Kanlaon complete through the API; 320 rows and one-degree resolution preserved |
| Large custom sweeps | 320/2,048 receptors, five grains, 32 layers and 400 cells match a scalar 360-bearing oracle, including the isotropic vent tie |
| Shifted Gaussian cell integration | Every cell of a small synthetic grid matches independent `math.erf` probabilities at six cardinal/oblique/nearly-360° wind-from bearings |
| Legal numerical extremes | Zero and maximum legal mass rate with a one-year source, minimum spread/density, no diffusion and calm wind retain finite nonnegative cells, thickness and integrated mass accounting |
| Finite-duration receptor accumulation | 25/37/49 snapshots match scalar class/layer arrival integrals, load-to-thickness conversion and emitted/deposited/airborne balance |
| Historical source gate | Current historical result remains unavailable with no simulation or fabricated metrics and both dependent reference traces exposed |
| Split leakage | Shared source dependency across distinct spatial groups and opposite splits is rejected |
| Strict request boundary | An invented terrain-physics field receives 422; a following valid computation succeeds |

The corrected largest sweep retains bounded admission rather than lifting the resource cap. The new bearing loop is consistent with the documented distinction between scenario orchestration and vectorized cell/grain computation. The orchestrator owns adaptation of the earlier whole-module AST test so that it continues enforcing the relevant numerical invariant.

## Formula, contract and data review

Read the current kernel, service, eruption, evidence, contracts and API modules against `COMPUTATION.md`, `ERUPTION_MODEL.md`, `EVALUATION_PROTOCOL.md`, `PARAMETER_REGISTER.md`, the manuscript Markdown and current gap/delivery records.

The implemented mixture allocates mass as `Q*T*fraction/layers`, uses release height divided by settling speed for fall time, advects in metres, and adds `2*K*time` to variance in square metres. Normalized Gaussian load has units kg/m². Independent cell probabilities and analytical receptors preserve their distinct cell-average and point-sample meanings. Thickness conversion `1000*load/bulk_density` gives millimetres; particle density is not substituted for bulk deposit density. Wind-from bearings transport in the opposite direction. No numerical terrain interception or altitude-dependent wind is implied.

Finite emission uses the settled component fraction `clip((t-tau)/T,0,1)`. Ground deposits, still-aloft mass and deposited mass outside the finite square remain separate. The mathematical release occurs at prescribed height; the illustrated rise speed does not delay numerical emission. The current lava relation uses normal channel depth and along-slope mean speed, with travel time based on inclined segment length. D8 routing and hot/cool appearance remain explicitly illustrative approximations.

The source/current-state capture [scientific_state.json](../qa/comprehensive_20261012/science/scientific_state.json) independently checks **27 source/derived SHA-256 entries** across four manifests, unique receptor/source identifiers, source-reference resolution, present input classifications and the current historical response. It records source-module and manuscript hashes and installed dependency versions. Hash checks establish retained-byte consistency, not correctness of the original measurements.

Current data remain 318 municipal/city receptors and two airports; 34 municipal records contain 2020 counts. No accepted damage criteria or water-facility inventory is fabricated. Parameter evidence distinguishes assumptions from measured/derived categories, and no parameter is labeled calibrated. Both archived Tanay launches cover **15/21 altitude-grid positions**, below the frozen 75% gate; no effective historical wind is returned. The two reference contours share one dependency family. These pre-existing incomplete-data and physical-model gates are documented limitations, not newly reported software defects.

The manuscript source accurately separates synthetic numerical verification, teaching assumptions, dependent contour repeatability and blocked empirical prediction. Its dated 164-test statement describes its earlier recorded review. This reviewer has not replaced or rendered the DOCX, revalidated live external publications, surveyed boundary stability, or performed a new native Word accessibility review. The earlier hash-bound manuscript page review remains dated evidence; no new page-layout pass is implied here.

## Reproduction and limits

From the repository root after the locked backend installation:

```powershell
uv run --project backend pytest qa/comprehensive_20261012/science/test_comprehensive_science.py
uv run --project backend python qa/comprehensive_20261012/science/capture_sweep.py qa/comprehensive_20261012/science/sweep_before.json --original-head
uv run --project backend python qa/comprehensive_20261012/science/capture_sweep.py qa/comprehensive_20261012/science/sweep_after.json
uv run --project backend python qa/comprehensive_20261012/science/capture_science_state.py
```

Use a different output filename when retaining another dated run. The original-head capture is tied to the pre-fix HEAD identity above; committing a replacement HEAD changes the meaning of that option. The current evidence used Python 3.12.14 and the locked installed backend environment. Local Ruff lint/format checks pass for this evaluator's new files. The orchestrator reports full integration gates separately.

Retained gates include missing independently accepted historical physical inputs and observations, incomplete administrative/historical census coverage, condition-specific impact criteria, and local release-height convergence. Uniform wind, flat ash ground, constant settling, absent aggregation/rain and the illustrative single-channel lava physics constrain applicability. New synthetic passes do not close those gates. Browser/GPU/accessibility/end-to-end display checks belong to the application evaluator and orchestrator, not this scientific report.

## Additional independent heap-retention analysis

At the orchestrator's request, this evaluator also analyzed the application evaluator's **pre-correction**, forced-GC `final-guide-unmounted.heapsnapshot`. This is a separate read-only engineering contribution, not numerical validation. The browser was on Guide with zero visible application canvas/map nodes and one intentionally retained completed result. [retention-analysis.json](../qa/comprehensive_20261012/science/retention-analysis.json) records exact identities, edge labels and retaining paths; [analyze_retention.py](../qa/comprehensive_20261012/science/analyze_retention.py) reproduces the graph analysis.

The snapshot SHA-256 is `b2292ee208506ad8576dbfaf66473e54a939fae26ba327369c4bc5312f390c3a`; it contains 770,881 nodes and 2,474,724 edges. The analysis found **12 detached rendered canvases** (`detachedness=2`) and **12 Three OrbitControls objects**. Every control has a strong retaining path from live Window/HTMLDocument through its event-listener storage to a bound function, then `bound_this` to the control and `domElement` to a detached canvas. The retained bound closure is the exact object in that control's `_interceptControlDown` property; this identity is asserted for all 12 objects. Representative IDs are document 843289, bound closure 805441, control 805443 and detached canvas 805523.

The parser excludes weak edges and `InjectedScript` nodes when finding these paths. A DevTools shortcut to the live document is therefore not the explanation for the control retention. The application-created controls remain registered with the live document; this is stronger evidence than aggregate listener/heap growth or an automation element handle alone. The browser counter campaign's map-only control was stable, while scene-only remounts grew; those browser measurements and fixture attribution remain owned by the application evaluator.

Installed Three r186 `OrbitControls.connect()` registers captured keydown on `domElement.getRootNode()` (line 505), whereas `disconnect()` recomputes that root (line 526). Once the canvas is detached, removal can target the canvas instead of the document used at registration. The application's `Camera` originally called `controls.dispose()` from its passive effect cleanup (`VolcanoScene.tsx:78`). The graph confirms the retained document/control/canvas chain; source inspection supplies this lifecycle mechanism.

The orchestrator corrected ownership through `orbitControlsLifecycle.ts`: capture the original event root, call normal disposal, then remove the exact `_interceptControlDown`/`_interceptControlUp` listeners from that original root. Vendor source is unchanged. This shim deliberately depends on the **locked Three r186 private listener names** and needs review when that dependency changes. The orchestrator reports installed-library regression tests; the application evaluator independently owns the corrected repeated-remount browser retest. This snapshot establishes the original retention and must not be mislabeled as correction proof.

Only **one** object with an `isWebGLRenderer` property was present. Its observed path passes through shared closure/module state. This snapshot does not prove that controls solely retain that renderer, establish GPU-memory leakage, attribute every aggregate detached node/listener, or replace the required browser cleanup/soak retests. No additional renderer defect is claimed from that one object.
