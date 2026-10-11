# Independent gap-closure QA — 11 October 2026

This evaluator keeps application implementation, curated inputs and the manuscript read-only. New evaluator scripts and evidence live in `qa/gap_closure/`. Implementation owners receive defects and make corrections; this report distinguishes implemented software, source readiness, numerical checks and empirical agreement.

## Frozen protocol review

**Methodological gate approved before evaluation. Empirical input gate remains source blocked.** `qa/gap_closure/protocol_review.json` records the independent review of `taal-main-plume-2020-v1`. The frozen method preserves distinct event definitions, height datums, vector averaging, dependency families, grouped splits and descriptive interval/midpoint errors. A predictive acceptance tolerance cannot be inferred from study fitting percentages.

The [publisher study](https://link.springer.com/article/10.1007/s00445-022-01534-y) associates its mapped main episode with 12 January 13:00–13 January 04:28 local time, **55,680 s**. Figure 2 describes a narrower intense period, and the fountain transition differs. The study discusses changing wind, delayed measurements and subjective contours. Its exposed supplement is a video. The narrative and table footprint areas remain unresolved; neither alone establishes a spatial polygon. Taal's current 311 m profile elevation is not a surveyed event-vent datum, as the input dictionary discloses.

## NOAA source and arithmetic audit

The evaluator independently read the [official IGRA format](https://www.ncei.noaa.gov/pub/data/igra/data/igra2-data-format.txt) and reconstructed selected profiles with scalar Python fixed-column parsing, trigonometry, interpolation and summation. The evaluator's parser does not call an ABO data parser or numerical wind function.

`qa/gap_closure/scalar_igra_audit.py` verifies all four archived selected soundings exactly against the full station ZIP. The two frozen target launches on 12 January have actual release times 00:11 and 11:40 UTC. Each admits nine distinct valid height/wind levels and covers only 15 of the 21 frozen height-grid positions (2–16 km), **71.4286%**, below the **75%** protocol gate. No launch passes; effective historical wind remains null. No gate was relaxed after inspection. The descriptive rejected-profile vector means are 10.0062455373 m/s from 176.1660619745° and 11.2392313710 m/s from 195.7624009547°. These are arithmetic checks, not reviewed plume-representative winds.

The JSON records raw archive/extract/format/station-list SHA-256 values, per-profile rejection and processing-flag counts, accepted heights and covered grid positions. Geopotential heights remain explicitly geopotential ASL; blank/A/B height flags describe processing scope and are not invented wind-quality flags. Source coverage is an observed blocker, distinct from failed model agreement.

Reproduce from `backend/`:

```powershell
uv run python ../qa/gap_closure/scalar_igra_audit.py
```

## Article and independently digitized source geometry

The first publisher download named `figure-4.png` was HTML, not an image; it was rejected before digitization and is explicitly recorded as a rejected acquisition. Subsequent acquisition through the official [PMC open-data archive](https://pmc.ncbi.nlm.nih.gov/tools/pmcaws/) supplied a real PDF, XML, JPEG and metadata. `audit_source_trace.py` independently verifies their SHA-256/MD5 values, PDF/JPEG signatures, article identity, open-access status and article CC BY 4.0 text. The archived XML Table 3 confirms **3,864.89 km² at 0.05 cm**; the narrative's **8,605 km²** remains a differing published statement. No target area was selected to tune a trace.

The evaluator traced the outer 0.05 cm (=0.5 mm) contour independently from the decoded PDF image, freezing 31 vertices and printed graticule controls before inspecting the scientific owner's trace coordinates or any model output. The evaluator's affine longitude/latitude control RMSE is 0.283/0.214 pixels; the stated reading/quantization bound is about 983 m. These describe tracing only, not the study's complete observation uncertainty. WGS84 is an explicit interpretation because the original map datum is not established.

After both traces were frozen, independent reconstruction from the scientific owner's pixels matched the repaired generated GeoJSON within **5.69 × 10⁻¹⁴ degrees**. WGS84 geodesic areas reproduce **8,639.950157 and 8,656.140982 km²**. A vent-centered azimuthal-equidistant comparison reproduces **IoU 0.979180236632**, boundary Hausdorff **1,901.341425 m**, and clipped areas **8,209.788261 / 8,234.147102 km²**. The separate evaluator equal-area comparison gives IoU 0.979181235801 and Hausdorff 1,843.821639 m; distances depend on projection. Original interpolation, field measurement, erosion, event interval and datum uncertainties remain additional and unquantified.

These are **digitization repeatability quantities**, not model-observation agreement. Both traces have dependency family `taal-deposit-study` and **zero independent point observations**. Final catalog/API records expose both geometries and their limits while preserving historical unavailability. Evidence: `trace-qa.json`, `trace-qa-evidence.json`, `independent-trace-comparison.json`, `independent-source-trace.json`.

## Numerical, conditional screening and API retests

`test_independent_gap_science.py` contains **23 passing independent synthetic cases**. They check scalar interval versus midpoint errors, equality/zero prediction, duplicate-location/spatial/source-family leakage, deterministic grouped splits and valid counterexamples, vector wrap/cancellation/interpolation, matching receptor type and conditions, receptor-specific applicability, `>=` threshold equality, unknown out-of-domain/missing criteria, missing 2020 populations and per-observation residuals. They do not fit or evaluate a real eruption.

The focused new-plus-legacy evaluator run passed **54 cases**. The whole Python test tree passed **130 cases** in the recorded integrated run. Root updated legacy synthetic fixtures to supply explicit applicability and distinct calibration/evaluation coordinates, retaining their original test intent rather than weakening the new rules. QA-owned scripts pass the active backend Ruff checks.

`audit_api.py` exercises the actual FastAPI application routes: health/catalog/simulation/replication return 200, invalid population year returns 422. The final catalog has 30 parameter records with required evidence fields and two derived reference footprints. Historical output has approved protocol identity, available=false, no simulation and no invented metrics. General simulations retain `not_historically_validated`. Missing 2020 values stay unknown, roof/crop criteria stay unknown, and airport surface-deposit screening remains a separate reporting quantity. Exact API payload evidence and catalog hash are in `independent-api.json`.

## Inventory, population and figure reproduction

`audit_inventory.py` independently parses **609 archived directory rows**, compares every **318 current population/code pair**, checks all **34 Batangas 2020/2024 pairs** against an evaluator transcription of the accessible primary PDF text, and checks available administrative correspondence codes. Direct original QuickSTAT PDF download remains unavailable; indexed primary text verification is not a visual inspection of the source PDF. Correspondence codes also do not prove unchanged historical boundaries.

Independent spatial intersection counts match the inventory: Taal **214 intersecting / 162 included / 52 unresolved**; Mayon **112 / 37 / 75**; Kanlaon **171 / 109 / 62**. Across domains there are 308 unique included records. Domain totals overlap. Twenty-three included polygon/domain pairs have centroids outside their associated square and therefore cannot receive an in-domain point prediction. Of 318 catalog municipalities, **34 have 2020 populations and 284 remain missing**. These results verify included transcriptions and coverage arithmetic, not complete jurisdiction coverage. See `independent-inventory.json`.

`audit_figures.py` reproduces all ten synthetic point values plotted in the manuscript within **3.47 × 10⁻¹⁸ mm** of the NumPy solver. The 50 km northeast baseline is 0.0269095272 mm. At 8/16/32 release layers it is 0.0411143712/0.0269095272/0.0318279992 mm. The **18.28% increase from 16 to 32 does not establish local convergence**. Integrated mass changes less; exact cell integration at 0.5/1/2 km does not remove this release-height approximation. The ±20% teaching perturbations are not confidence intervals or historical residuals. `independent-figures.json` records input hashes and reproduction.

## Findings and correction retests

| Finding | Evidence | Status |
| --- | --- | --- |
| P2: false image success after publisher challenge | Initial `figure-4.png` was 3,038 bytes beginning with `<!DOCTYPE html>`. Real PMC PDF/JPEG/metadata subsequently acquired and hash/type checked. | Closed: rejected artifact is disclosed; accepted digitization uses actual decoded source image. |
| P2: wind wrap produced exactly 360°, outside the scenario contract | Independent 359°/1° vector mean exposed roundoff at the wrap. | Closed: scientific owner normalizes to 0°; boundary/cancellation counterexamples pass. |
| P2: negative historical population record bypassed selected-population validation | Population-year map accepted -1 and selected it with `model_copy`. | Closed: bounded year values and invalid/missing counterexamples pass. |
| P2: interrupted contour integration wrote null GeoJSON | `georeference` return block had been inserted after another function's return. Frozen trace itself was unchanged. | Closed: owner repaired placement; independent pixel reconstruction and derived outputs reproduce. |
| Source-specific licensing and inventory correspondence precision | Generic evidence license copy and incomplete indexed-source join claims were flagged. | Closed within available evidence: source-specific terms and indexed-source/crosswalk limits disclosed. Original source access and boundary history are retained limits. |
| Historical vent datum cannot inherit a profile elevation | Taal 311 m profile is not an active-event survey. | Source blocked, visible in input register and historical response. |
| Candidate soundings fail frozen vertical coverage | 71.4286% versus frozen 75%; zero launches accepted. | Source blocked, preserved in catalog/API. No relaxed threshold or fabricated wind. |
| Local release-height approximation sensitivity | 16→32 layers changes one stated receptor by 18.28%. | Retained model limitation; manuscript explicitly discloses non-convergence at that point. |

## Browser and final manuscript gates

Engineering is measuring controlled production replays before releasing foreground Chrome for independent failure/motion/layout tasks. Root owns in-app browser timing and rendering. Independent browser fault checks and final Microsoft Word replacement-page inspection remain pending at this report revision. No unperformed check is marked passed. Actual screen-reader speech tasks and the native Word accessibility checker have not been performed; an accessibility tree or tagged PDF cannot substitute for either.

The updated manuscript's scientific content was independently reviewed against the source, inventory, figure and trace evidence above. Final content hashes, exact Arial 11/12 pt typography, editable OMML, figure alternative text, Word pagination and every replacement rendered page will be checked only after the final DOCX/Word render is frozen. `audit_manuscript.py` rejects a PDF/source hash mismatch and reads the actual Word PDF, not the older rendering fallback.

## Reproduction and scientific conclusion

Run from `backend/`:

```powershell
uv run pytest ../qa/gap_closure/test_independent_gap_science.py ../qa/test_independent.py -q
uv run python ../qa/gap_closure/scalar_igra_audit.py
uv run python ../qa/gap_closure/audit_inventory.py
uv run python ../qa/gap_closure/audit_figures.py
uv run python ../qa/gap_closure/audit_source_trace.py
uv run python ../qa/gap_closure/compare_traces.py
uv run python ../qa/gap_closure/audit_api.py
```

Implemented synthetic/numerical/data/API checks pass within their stated scope. The historical model was **not empirically evaluated**, so no model agreement failure or empirical PASS is reported. Source-blocked physical inputs, incomplete observations/uncertainty and retained reduced-model limitations remain distinct from corrected software defects.

## Orchestrator integration appendix — not a new independent sign-off

Added by the orchestrator after the evaluator reached the account usage limit. The evaluator's statements above are preserved at their review revision. Science completed its final handoff with 142 full Python cases, 31 parameter records, 318 municipal/city records and two airports. Frontend checks pass 56 cases. Generated contracts and runtime footprint validators are integrated.

The final production bundle is `index-lYFWRuYY.js`. `qa/browser/gap-final-retest.json` records orchestrator execution of the saved independent failure/motion/layout cases, with actual context loss, renderer exception, terrain HTTP 503, WebGL denial and reduced-motion changes passing. The actual hidden-page attempt remains unestablished. A separate completed-2020-request/unsent-2024-edit scenario export test passes. These executions do not replace independent final integration review.

Final browser timing, raw callbacks, sampled OS foreground evidence and the completed resource soak are in [ENGINEERING_GAP_EVIDENCE.md](ENGINEERING_GAP_EVIDENCE.md). Measured replay targets pass, while resource growth prevents a full cleanup PASS. Native zoom/speech accessibility remains unperformed.

The saved independent manuscript audit script was run by the orchestrator against the actual Microsoft Word PDF. It finds no content or typography issues, seven editable equations and three figures with alternative text. The orchestrator inspected all 15 pages and reinspected the corrected caption-related page; [RESEARCH_DOCUMENT_QA.md](RESEARCH_DOCUMENT_QA.md) identifies exact hashes. **Independent visual inspection of the final replacement pages remains pending**, as does independent final bundle sign-off. [GAP_REGISTER.md](GAP_REGISTER.md) is the current consolidated gate record.
