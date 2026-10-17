# Dashboard redesign — 17 October 2026

Implemented the user's blue-and-white dashboard and raw-data-modal references while preserving the requested separate Simulation page.

## Subsequent 1080p visual review

At 1920 × 1080 the first version presented four equally weighted panels inside a 1540px workspace. Small labels and broad unused margins weakened hierarchy. Replaced that composition with a 1760px workspace, a larger navy accumulation plot leading the reading order, a narrower ranking with selected/comparison emphasis, and secondary distribution/settings panels. The selected location's real final sampled deposit is shown next to its elapsed time. The SVG plotting coordinate space expands to use the wider panel; physical results are unchanged. Changed the purple distribution band to a muted blue so the palette remains coherent without treating colors as hazard severity.

The first refinement overflowed 1080p by about 72px; it was rejected and adjusted with height-specific plot, spacing and doughnut sizes. Do not use that intermediate screenshot as final evidence. Exact token contrast checks give 13.17:1 for primary hero text, 9.08:1 for secondary hero text and 8.19:1 for the curve against the navy plot. Muted comparison bars were darkened to 3.40:1 against their track. These checks are specific color-pair evidence, not an exhaustive accessibility certification.

Final served-build measurements after compact-spacing corrections: document dimensions equal 1920 × 1080, 1440 × 900, and 1366 × 768 at the respective viewport sizes, without document scrolling. Light and dark 1080p compositions were visually reviewed before the final margin-only corrections. After reconnecting the browser, final DOM measurements and interactions passed but screenshot capture became unavailable; no final-margin screenshot is claimed. Selecting Talisay updated the highlighted ranking and final sampled reading to the same 24.13 mm value. Searching Laurel in the modal left one row. At 320px, document width was 310px (scrollbar excluded), with the intended 740px chart inside its own horizontal scroll region. The viewport override was reset and Dashboard left open. Full frontend checks remained 115 passing tests, and Python checks passed 219 tests with Ruff lint/format; generated contracts remain unchanged.

## Independent review follow-up

At the user's request, a separate read-only QA agent reviewed source, targeted tests, live Chromium workflows and screenshots. The full report and reproduction evidence are in `qa/current_review/dashboard_independent_20261017/REPORT.md`.

The review confirmed the desktop dimensions, light/dark composition, real chart/CSV agreement, missing-data classification, preset failure/retry and delayed-request isolation, and spatial canvas cleanup. It found a misleading Event snapshots subtitle, which the implementation owner changed to tab-dependent scope (Computed event snapshots / Eventual totals / Run provenance) with a regression test; that correction passed independent browser retesting.

Additional tablet testing found a pre-existing media-rule collision: a collapsed laboratory retained two grid tracks between 701px and 1000px, squeezing Dashboard into the 290px first track. The collapsed-grid selector now has sufficient specificity, and the dashboard stacks its panels through 1099px with a wrapping chart header to prevent dropdown overflow and keep plot labels readable. Independent retest evidence is recorded in the evaluator's report. The new full frontend suite contains 116 cases.

## Final pre-push verification

A fresh verification agent independently rechecked the corrected build and marked it ready within the tested UI scope, with no unresolved actionable findings. Its report and portable browser assertions are in `qa/current_review/dashboard_release_verify_20261017/REPORT.md`.

The implementation owner's fresh release checks passed frontend lint/types/116 tests/build, 219 Python tests and unchanged generated contracts. The exact full-workspace Ruff commands found errors only in another task's untracked `qa/current_review/times_reference_final_20261017/check_content.py`; leaving that file untouched, both lint and formatting pass with that exact unrelated path excluded. That manuscript QA file and all other manuscript changes are excluded from the dashboard commit. This baseline workspace exception is not a passing claim for unrelated work.

## Delivered behavior

- Dashboard opens first, with a preset dropdown, municipality thickness ranking, computed event-time curve, deposit-band doughnut, and concise scenario data.
- Presets are calculated using the existing local Python endpoints. The time series uses actual nonuniform snapshot times, preserves missing samples as gaps, and does not add physics to React. At most two preset results are cached in the component. A last-completed custom simulation can be selected separately.
- Deposit bands are disjoint, include below-trace values, and exclude outside-domain and unknown municipal values explicitly. Counts are municipal centroids, not measured individual exposure or hazard severity.
- The native Run data dialog includes search, domain filters, sort, filtered CSV, event snapshots, provenance and result JSON. Unknown data remain unknown. Escape closes the modal and restores the invoking control's focus.
- Simulation retains aligned 3D/map viewports with folded map layers, input controls on demand, one shared replay below, and detailed exposure behind a disclosure. Leaving Simulation pauses replay and unmounts its spatial views. Sources and existing analysis workflows remain available.
- The manuscript and its in-progress research/QA artifacts were preserved. Existing repository-map content was preserved with an added routing entry.

## Verification

Full frontend lint, TypeScript, 115 tests in 23 files, and production build passed. The four new cases cover exact deposit-band endpoints and missing/outside-domain semantics, computed preset presentation, and failed-preset/retry isolation. Existing workspace tests were updated to enter Simulation and reveal inputs explicitly; scientific behavior assertions remain.

Required Python checks passed: Ruff lint, formatting on 60 files, and 219 tests. Generated OpenAPI and TypeScript contracts have no diff. No backend numerical code or curated scientific inputs changed.

Live in-app browser checks on the served production build:

- Dashboard at 1440 × 900 has document height 900 and no horizontal overflow.
- Compact dashboard at 1366 × 768 has document height 768 and width 1366; no page scrolling. No WebGL canvas is mounted on Dashboard.
- Light and dark dashboards were visually inspected. At 320px, cards stack and no horizontal document overflow was observed. The time-series chart has a keyboard-focusable horizontal scroll region to retain legible labels.
- Selecting Mayon's preset populated its own computed context (34/320 covered locations); it did not retain Taal's 163/320 coverage label.
- The raw table initially contained 320 records. Searching Laurel produced one record; the downloaded CSV contained its full-precision values, census year, screening reasons, solver and dataset revision. The browser's generated download was inspected as text.
- Escape closed the dialog and restored focus to View raw data. Event snapshots displayed 37 computed rows for the selected regional Taal location; run details exposed the provenance view.
- A real Taal simulation completed. Scene and map top edges differed by less than one CSS pixel and had equal viewport heights. The shared During control was exercised. A browser inspection briefly timed out during scene startup; a subsequent inspection confirmed the controls and rendered views were present. No timing or GPU-performance pass is inferred.

## Evidence limits

This is local application/build/browser evidence, not deployment or historical scientific validation. No native screen-reader, cross-device graphics, hardware-performance, exhaustive accessibility or native browser-zoom certification is claimed. Desktop compactness permits necessary scrolling on narrow screens, enlarged text and expanded data views. The generated design-reference charts were not used as numerical data or geographic assets.
