# Independent current application QA — 12 October 2026

This is an independent application review of commit `8dec71e` and the served `index-BfQBsCVz.js` production build. The evaluator did not edit application implementation or scientific datasets. Corrections and their retest status are recorded below separately. Academic illustration functionality does not establish real eruption accuracy.

## Scope and evidence

`npm run check` independently passed ESLint, TypeScript, all 61 frontend cases, and production build. The existing large Three.js chunk warning remains a warning, not a failed build. Real in-app browser workflows covered a default Taal run, stage seeks, Mayon with lava enabled, ash/lava map modes, completed-result retention after a draft edit, scenario JSON download, the historical evidence interface, and 320 px dark-theme reflow. Viewport and light theme were restored after the check.

Evidence is retained in `qa/current_review/app-baseline.json`, `app-320-dark.jpg`, and `app-mayon-before.jpg`, `app-mayon-during.jpg`, `app-mayon-after.jpg`. Screenshots show the actual served application. The scenario download was read from disk: after an unsent change from 10 to 20 m/s, it correctly retained the completed 10 m/s scenario and 2024 reporting year. The browser console reported no errors in these workflows.

## Findings

| Finding | Evidence and consequence | Status |
| --- | --- | --- |
| Snapshot wording implied one instantaneous physical clock | `eruptionDisplayFrame` interpolates physical time and lava front between Python snapshots; `Workspace` and `EruptionTimeline` use the preceding integer snapshot for quantitative map values. The visible label `Model time` and guide wording did not explain this distinction. Rendering is intentionally interpolated, but viewers can mistake the map for the continuously interpolated instant. | Closed: independent final-browser retest |
| Corrupted scientific symbols in catalog text | Historical view displayed `kmÂ²`; `data/catalog.json` also contained `kmÂ³` and two screening-context labels containing `Â·`. The numerical data are unaffected, but source descriptions and units look incorrect. | Closed for reviewed live historical/condition labels; corrected sources read back |
| Unavailable-terrain horizon is visually abrupt in Mayon close-up | The straight gray distant band also appears at Before with no cloud; it is not evidence of a cloud-shader fault. Neutral geometry outside the 100 km DEM is already documented as unavailable terrain. | Retained display limitation; no scientific claim attached |

The first suspicion that the gray band came from cloud impostors was rejected by the Before-stage counterexample. No cloud-shader correction is supported by that evidence.

## Verified interpretation and workflows

- Taal displays Island relief ×6 and fountain illustration ×4; transport arrow carries its text label, while meteorological wind FROM remains separate. The 320 px scene keeps the arrow text below the terrain title. Mobile document width was 310 CSS px, matching its 310 px scroll width, within the requested 320 px viewport.
- Mayon lava is visible down the cone in its oblique close-up. The map calls it a teaching model, distinguishes the enlarged centerline from prescribed-width area, and refuses a validated-runout/cooling claim. Its stage readout uses hours and the selected map snapshot.
- Draft changes display a stale-result notice and pause playback. Both the scene caption and downloaded scenario retain completed inputs. Final tables and CSV controls are labeled eventual totals rather than current-snapshot quantities.
- The historical view reports unavailable evaluation, 71.43% sounding coverage below the 75% frozen gate, unresolved footprint-area definitions, and absent independent geolocated thickness observations. It does not invent residuals or model-agreement metrics.
- The map legend identifies thickness in millimeters and explicitly distinguishes it from hazard severity. Surface ash screening remains separate from roof safety, water potability and airborne aviation guidance.
- The shared player is paused on completed runs. Before/During/After controls seek the sequence; Play/Pause serves motion, Reset camera serves viewpoint. These are distinct actions rather than duplicate controls.

## Evidence limits

This bounded review did not repeat the three foreground replays per browser/settings, 30-minute soak, actual hidden-page transition, native 200% zoom, screen-reader speech, or graphics-failure injection. Those historical checks and their open gaps remain in the gap register; they are not certified for the current renderer by this report. Scientific source completeness, empirical accuracy and manuscript verification belong to the independent scientific/research evaluator. Enlarged particles, cohort interpolation, plume texture, fountain shape, cooling colors and neutral outside-DEM surfaces remain illustrations.

## Skill usefulness in this review

The local QA skill's requirement to trace shared clocks and computed outputs directed a concrete comparison of the interpolated 3D frame against the integer map frame. Anti-slop's evidence-over-claims and resilience rules identified the missing snapshot distinction and checked the stale-result/mobile counterexamples. Its redundancy extension correctly preserves camera reset, stage seek and replay as distinct controls. These are demonstrated uses in this review, not proof that the skills guarantee scientific validation or exhaustive accessibility.

## Correction retests

The independently reloaded `index-CzstAtRQ.js` build and refreshed local API passed correction retests. Actual visible timeline text is `Map snapshot: 0.5 h / 27.9 h`; its range accessible description says `During eruption, map snapshot at 0.5 hours`. The visible replay note explicitly distinguishes interpolated 3D motion from the preceding computed map snapshot. The guide readback makes the same distinction and labels folded table/CSV as eventual deposition.

The historical reason now renders `8,605 km²` and `3,864.89 km²`. Both custom screening-condition options show a proper middle dot. Loading/normal run and stale-result retention passed again; the second downloaded JSON still records the completed 10 m/s scenario and 2024 population year after an unsent 20 m/s edit. No console errors were recorded. Final evidence: `qa/current_review/app-retest.json` and `app-retest.jpg`.

These corrections close the two concrete presentation defects. They do not close the scientific input/empirical-validation or broader lifecycle/accessibility gates described above.
