# QA remediation results, 15 October 2026

This delivery applies the [remediation plan](QA_REMEDIATION_PLAN_20261015.md) to the existing post-pull QA corrections. Base Git commit is `dc13dbe`; the completed corrections and deliberate evidence artifacts are included in the 16 October repository handoff. Previous dated QA reports remain historical evidence.

## Implemented corrections

The pulse accounting/parcels/column, profile sweep, batch admission, wind comparison, response-shape, camera cleanup and source-claim corrections from the comprehensive QA are retained. The follow-up adds:

1. **Stable profile-sweep ties.** Rotate receptors in the source frame so an isotropic vent does not acquire an arbitrary bearing from floating-point vector-norm changes.
2. **Pulse-aware animation snapshots.** Every positive-rate pulse contributes its start and representable interior; the final deposited endpoint remains. Fill the fixed frame budget by coverage, and reject unrepresentable interiors. A legal one-second interior eruption can no longer disappear between every frame.
3. **Graphics ownership.** Unmount disabled context layers, let R3F retire declarative mesh resources, and release material shader-hook references on material disposal. Filters no longer explicitly dispose geometry still owned by the active mesh.
4. **Playback fallback.** Both playback paths pause on window blur and pagehide as well as visibility/reduced-motion changes; focus restoration does not resume playback.
5. **Build structure.** Independently cache Three core, WebGL and map dependencies. The largest JavaScript chunk is 377.28 kB, down from the previous 982.40 kB scene chunk, without increasing warning thresholds.
6. **Numerical disclosure.** Controls and per-result provenance explicitly state that finite midpoint quadrature does not establish local convergence. A separate independent scalar probe preserves the actual error evidence; the reproducible 16-layer default and 32-layer API limit remain unchanged.
7. **Keyboard table access.** The mobile inventory table's scroll container is a named, keyboard-focusable region with a theme-aware focus outline. The expanded axe campaign found this defect after the opening-page scan passed.

## Verification

- Python lint/format and 212 backend/QA tests passed after the numerical and lifecycle changes. Independent focused science/curation evidence: 21 cases passed, including the two newly reproduced edge cases.
- Final 16 October handoff verification passed Python lint/format and all 212 backend/QA tests, plus frontend lint, TypeScript, all 101 Vitest tests and the canonical production build. The isolated production build also passed the expanded browser retest below.
- No authoritative contract fields changed. Regenerated OpenAPI and TypeScript schema have no unexpected diff.
- Native Microsoft Word 16.0 build 16.0.20326 exported the unchanged actual DOCX read-only. The content audit finds all 162 prose/table paragraphs in the 16-page PDF, Arial-only rendered fonts and seven editable equations. The orchestrator and independent evaluator visually reviewed all pages; the evaluator additionally reviewed full-size equation and final-reference pages. No clipping or overlap was observed. Source hash remains `666ce8604ed6acfad35730b9c8330e613b421bd9ba170da2f99c54180ae2da3a`; PDF hash `d8773190707326f212e8c1022b4a39f0344031b37a6a460e6a71c2d8052b0da4`.
- The native Word checker and screen-reader interactions are not certified by a tagged PDF or automated browser scan.

## Timed resource and browser acceptance

The fixed-asset resource run passed its bounded acceptance criteria after 1,816.522 seconds and 42 cycles. All 42 paused draw samples were zero; no JavaScript exceptions occurred, asset hashes stayed unchanged, and one live context/canvas remained. Post-GC heap increased from 31,294,492 to 34,635,240 bytes (about 3.19 MiB); DOM nodes stayed at 11,333 and listeners changed from 1,293 to 1,295. Outstanding textures/framebuffers stayed at 9/3, while buffers/programs/vertex arrays decreased from 51/13/18 to 41/11/13. Raw evidence is `output/playwright/remediation-20261015/soak.json`.

This run used Windows, AMD Ryzen 7 5800U, AMD Radeon D3D11 and Chrome 155.0.8059.41. Playwright focus emulation supported resource-run continuity; these measurements do not establish native foreground performance, actual hidden-page transitions, physical VRAM retention or behavior on other devices.

The accessibility retest used an isolated production output at `.runtime/remediation-final-dist`, leaving the timed run's assets unchanged. The canonical build and full handoff checks were rerun after the soak. Raw axe results and real keyboard-scroll evidence are in `output/playwright/remediation-20261015/a11y-workflows.json`.

Axe-core 4.13.0 reports zero WCAG 2 A/AA and 2.1 AA violations in nine states: opening desktop light, expanded computed desktop light/dark, expanded computed 320 px light/dark, unavailable historical evidence, expanded guide, manual comparison and sweep. Actual mobile inventory focus and ArrowRight changed `scrollLeft` from 0 to 40 pixels. No JavaScript exceptions occurred. Axe's incomplete checks remain manual-review items; zero automated violations is not a native screen-reader pass.

## Evidence and retained gates

| Gate | Current result and next requirement |
| --- | --- |
| Original numerical and source-safety defects | Corrected and independently retested; see `QA_SCIENCE_20261015.md` and `qa/review_20261015/science/` |
| Local release-height convergence | Open. At the declared Mayon point, adaptive reference is 0.029993051911690365 mm; 16/32-layer relative errors are about 10.28%/6.12%. The probe covers one teaching case. A generalized refinement mode needs independent feature-resolution and resource validation across grains/profiles/pulses. |
| Historical predictive agreement | Source blocked. Do not relax the frozen Tanay coverage gate, fit to dependent contours or fabricate mass/density/grain/datum inputs. |
| Contextual source completion | Exact TROPOMI product/QA derivation, activity bulletins, network and HDX identities still require reviewed source artifacts. Their current draft records remain unavailable in the app. |
| Complete municipal/census coverage | Source blocked pending reviewed stable-code crosswalks/transcriptions; missing counts and outside-domain centroids remain unknown. |
| Actual hidden-page transition | Inconclusive in this automated environment, including minimized windows and sibling tabs with Playwright focus emulation explicitly disabled. Focus-loss pause is verified separately; it does not establish that a real hidden state was observed. |
| Native accessibility | Open. Requires screen-reader operation and actual Word accessibility-checker review. Automated axe, keyboard tests and visual review have narrower scopes. |
| Multi-device performance and native VRAM retention | Open. One Windows/AMD machine and allocation counters do not certify other devices or physical driver memory. |
| Three.Clock deprecation | Upstream compatibility debt. Installed R3F 9.8.1 constructs Clock internally and uses its start/stop/elapsedTime interface. Three.Timer has a different API; no dependency patch, warning suppression or unverified upgrade was introduced. |

These remaining scientific and native-evaluation gates are explicit requirements, not defects that can be closed by changing labels or passing unit tests.

## Reproduction

Use `scripts/setup.ps1` for the locked environment and required frontend/backend checks. Run resource acceptance with `ABO_QA_URL` set to the current production server and `node qa/browser/remediation-soak.cjs`; default duration is 1,800 seconds. The harness supports a separate `ABO_QA_OUTPUT` directory for short/lifecycle attempts and preserves build hashes. Run `qa/browser/remediation-accessibility.cjs` with `ABO_AXE_SOURCE` pointing to an installed `axe-core/axe.min.js`; axe-core 4.13.0 was used here without changing the application's dependency locks.

Native Word render and content audit commands use separate output directories and leave the DOCX unchanged. The independent final review is `qa/review_20261015/science/remediation_final_review.md`.
