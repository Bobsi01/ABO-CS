# QA remediation plan, 15 October 2026

This plan builds on `COMPREHENSIVE_QA_20261015.md` and the independent science report. The existing uncommitted corrections are part of this work and must be preserved. Implementation and acceptance evidence are recorded separately; a source block cannot be closed by a unit test.

| Priority | Work | Implementation and acceptance | Status |
| --- | --- | --- | --- |
| P1 | Pulse mass, parcels and column | One component source for timing, winds and mass. Independent unequal-rate, delayed and unequal-height cases must conserve mass in every frame. | Implemented; independent regressions pass |
| P1 | Profile sweeps and comparison | Rotate the profile together; apply returned directions to draft levels. Bound direction batches; compare two explicitly uniform winds. Scalar reference, all-320-receptor and live UI checks. | Implemented; independent and browser checks pass |
| P1 | Incorrect or unsupported source claims | Correct Bato dimensions using archived paper/page/hash. Withhold unsupported numeric values; keep draft activity/network/HDX records source-blocked. Curation must reproduce packaged bytes and never fabricate fallback observations. | Implemented; further source intake is blocked on exact artifacts |
| P1 | Response and lifecycle safety | Validate every consumed response shape. Dispose camera listeners from their original document root. Exercise failures and repeated mount/unmount cycles. | Implemented; extend checks below |
| P2 | Context-layer resource lifetime | R3F owns declarative mesh disposal; context objects unmount when switched off. Renderer hooks retire when materials dispose. Focused lifecycle regression and real repeated layer/filter cycles. | Implemented; 42-cycle resource acceptance passed |
| P2 | Hidden-page and long-run evidence | Use real browser/window lifecycle; record actual hidden state, slider pause and restoration. Run a 30-minute production-build soak with periodic runs/view/layer cycles, post-GC heap/DOM/listener metrics and GL allocations. Preserve incremental evidence on failure. | 1,816.522-second resource run passed; actual hidden-page transition remains inconclusive |
| P2 | Build and dependency warnings | Separate cacheable Three core/WebGL and map bundles. Maximum emitted JS chunk is 377.28 kB without raising size limits. Installed R3F 9.8.1 constructs Three.Clock internally and requires its start/stop/elapsedTime API; Timer is not a compatible replacement. | Build-size warning fixed; upstream Clock warning retained visibly |
| P2 | Numerical approximation | Independent adaptive scalar probe with 64 initial height intervals confirms 10.28%/6.12% local error at 16/32 layers in its one declared case. Preserve reproducible defaults; disclose unresolved convergence in controls/provenance. Opt-in generalized refinement requires a separate frozen numerical protocol and independent reference across profiles/pulses. | Probe complete; limitation disclosed; generalized convergence remains open |
| P2 | Accessibility and control coverage | Keep blue design, keyboard/focus, both themes, 320 px layout, reduced motion, failure recovery, real exports and all implemented control groups. Run automated accessibility checks if locally available; native screen-reader/Word checks remain explicit separate gates. | Nine axe workflow states and real mobile keyboard scrolling passed; native checks remain open |
| P3 | Reproducibility and current status | Retain source dates/units/datum/review states; retain archived reports as dated history. Update map, gap register and final remediation report. Run full Python/frontend/contract gates after code changes. | Full handoff checks rerun on 16 October; see remediation results |

## Source and research acceptance gates

- Historical agreement requires reviewed mass, density, grains, vent datum and wind, independent observations, frozen comparison tolerances and no calibration/evaluation leakage. Tanay coverage remains below the frozen threshold; no extrapolation or relaxed gate is authorized.
- Administrative/population completion requires archived official records with stable-code crosswalks and independent transcription checks. Missing counts never inherit a different census year.
- Satellite context requires an exact product/granule, orbit/time, QA mask and reproducible numerical derivation. Activity timelines need dated bulletin artifacts and per-value locators; network and HDX claims need exact archived source identities. Current source-blocked records stay unavailable until those requirements pass.
- Existing manuscript is not rewritten to imply new validation. Any later manuscript edit requires regeneration, actual-DOCX audit, rendering and every changed page inspection, with native accessibility and independent review separate.

## Execution order

1. Preserve and recheck confirmed corrections; investigate actual graphics ownership.
2. Fix resource defects and run focused tests, then build stable production assets.
3. Start the timed soak against that fixed build; perform independent science assessment and report preparation while it runs. Do not rebuild during the run.
4. Review results, fix reproduced failures, rerun affected checks; leave unavailable evaluations visibly open.
5. Run final integration gates and record the exact evidence and remaining limitations.

The implementation plan excluded destructive cleanup and dependency upgrades. The user's subsequent 16 October request authorizes committing and pushing the pending repository changes.

## Additional defects found during execution

- Profile rotation changed vector norms by floating-point roundoff and invented a preferred bearing at the vent. Rotate receptors instead; exact vent symmetry retains the earliest bearing. Independent scalar and tie regressions pass.
- A short positive pulse could fall between every timeline snapshot. Require each positive pulse's start and representable interior plus the fully deposited endpoint, then fill the bounded frame budget by farthest-point spacing. Reject unrepresentable pulse interiors. Independent regression passes.
- Context meshes disposed live geometry on filter changes, while hidden primitive layers stayed mounted. Use reconciler ownership for declarative meshes and conditional mounting for context layers.
- Renderer shader-hook maps kept disposed materials until renderer retirement. Material-dispose listeners now release those references immediately; the regression invokes the production helper.
- Window focus/page loss now pauses both playback paths without resuming on focus return. Real minimized/alternate-tab experiments and mocked focus tests are recorded separately; an unobserved `document.hidden=true` remains inconclusive.
- Expanded axe checks found that the mobile inventory table could not receive keyboard focus. Give its scroll container a named region, a tab stop and a theme-aware focus outline; retest the actual guide screen and horizontal arrow-key scrolling. This accessibility-only change is built after the fixed-asset resource soak.

## Timed-resource acceptance protocol

The 1,800-second run uses fixed production assets and one Taal scenario with full replays, actual backend reruns, depth filtering, context-layer toggles and view mount/unmount cycles. A short warm-up precedes the baseline. Every sample forces V8 garbage collection and records heap, nodes, documents, listeners, canvas count and tracked GL allocations. The harness accepts one canvas, no growth in live GL context count, no JavaScript exceptions, zero draws in each paused window, post-GC heap within 20 MiB of the warmed baseline and listeners within ten. Raw trends and per-resource counts must still be reviewed; these tolerances are bounded test criteria, not proof that no leak can exist. It records exact asset hashes and rejects a changed build. Playwright focus emulation during the resource soak is distinct from native foreground performance and actual visibility tests.

Native accessibility closure requires keyboard-only and screen-reader operation of scenario selection, form validation, replay, location inspection, tables/downloads, historical unavailable states and graphics fallback, plus the Word accessibility checker for the manuscript. Automated axe results and tagged PDFs cannot substitute for those checks.
