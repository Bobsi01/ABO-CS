# Independent dashboard QA — 17 October 2026

Scope: uncommitted Dashboard/dashboardData tests and implementation, dashboard.css/main.tsx, Workspace navigation and modal/spatial disclosure changes, GeographicMap and EruptionTimeline. Read-only evaluator; implementation, manuscript, curated data and unrelated work were not changed. Local QA/browser scripts and evidence only were added.

## Finding

**P2 — Event-snapshot table is labeled as eventual totals.** `frontend/src/components/Dashboard.tsx:119` sets the dialog subtitle to `Eventual totals` unconditionally; line 124 changes its content to finite-time snapshot rows. Reproduce: open regional Taal Dashboard → View raw data → Event snapshots. Browser observed 37 rows, from 0 h / 0 mm to 103.411 h / 24.13 mm for Talisay, while the dialog still says Eventual totals. Those intermediate values have a different scope. Make the subtitle tab-specific (event snapshots versus eventual location totals; provenance can use neutral run-details wording), and test switching tabs. This is an interpretation defect, not incorrect computed values. Reported to implementation owner for correction; original capture is in browser.json.

## Passed

- Fresh targeted Vitest: 3 files / 8 tests passed (Dashboard, dashboardData, Workspace); actual run 41.89 s. No inference from prior reported full-suite counts.
- Chromium screenshots visually reviewed at 1920×1080 light/dark. Dominant plot, distinct selected ranking, real measured reading and supporting distribution/settings hierarchy remain legible and unclipped. Visual preference is subjective; these are current implementation screenshots.
- Measured document exactly 1920×1080, 1440×900 and 1366×768 at matching viewports, with zero dashboard WebGL canvases. At 320×800, width is 320 and document height 2358: responsive vertical scroll with no document horizontal overflow. The line chart retains its own horizontal region.
- Municipal band boundaries are mutually exclusive in tested fixtures; unknown/outside values and facilities are excluded. Live counts sum to 162 known centroids; >=0.5 mm bands sum to the reported 100. Domain coverage's 163 locations includes nonmunicipal locations, so it correctly differs from the 162-centroid doughnut denominator.
- Selecting Talisay updates the plotted final reading to 24.13 mm. Laurel search yields one record, and CSV retains 19.85037077245691 mm, 2024 population, screening reasons and provenance. Unknown screening remains unknown.
- Escape closes native dialog and restores focus to View raw data. At 320px the dialog bounds are x=19..301, with internal table scroll and no dialog horizontal overflow.
- Real Mayon preset succeeds with its own 34/320 coverage, rather than old Taal coverage.
- Injected HTTP 503 hides old charts, disables raw data and exposes error/retry. Removing injected failure and clicking retry recovers Mayon successfully.
- Delayed Taal-teaching request immediately superseded by Mayon stays on Mayon after delayed request processing; no alert or stale result overwrite observed.
- Real Taal Simulation completed. At 1080p, scene/map widths and heights matched (890.8125×367.1875 px); top edges differed by 0.141 px. Returning to Dashboard unmounted all canvas elements.
- No page errors were recorded in the main dashboard/browser sequence.

## Evidence

- `qa/current_review/dashboard_independent_20261017/browser.json`: exact viewport, selection, CSV, scope, modal and preset evidence.
- `resilience.json`: injected failure/recovery, mobile modal, simulation bounds and dashboard canvas cleanup.
- `race.json`: delayed request/preset transition evidence.
- `output/playwright/dashboard-independent-1080p.png`
- `output/playwright/dashboard-independent-dark-1080p.png`
- `output/playwright/dashboard-independent-1366.png`
- `output/playwright/dashboard-independent-320.png`
- `output/playwright/dashboard-independent-modal-320.png`

## Not run / evidence limits

Fresh full frontend/Python gates, native screen reader, native browser zoom, exhaustive axe/focus/contrast combinations, repeated GPU lifecycle soak and cross-device performance were not run by this independent evaluator. Existing unit tests cover missing-data bands and failed preset retry; no claim of exhaustive async scheduling or catalog replacement coverage. Initial browser attempt found no server (ERR_CONNECTION_REFUSED); parent restarted the local server and all reported browser cases then ran against it. Two initial QA-script selector attempts selected a hidden simulation selector or failed label matching; scripts were corrected to scope the native dashboard select, and those automation errors were not counted as app defects. Headless Chromium is local browser evidence, not production deployment or scientific/historical predictive validity. No backend numerical implementation was changed or independently recalibrated.

## Additional tablet finding (found after first report)

**P2 — Collapsed dashboard grid breaks between 701 and 1000px; chart selector also spills at 761–1099px.** `frontend/src/styles.css:267` applies `main.laboratory { grid-template-columns:290px minmax(0,1fr) }` after the earlier collapsed-grid rule at line 49. The dashboard's aside is hidden, so workspace is laid into the first 290px track. At 800×900 the two plot panels were only 99.40625px wide and most viewport width was unused; labels/buttons overlap. Screenshot: `output/playwright/dashboard-independent-800.png`. Separately, `frontend/src/dashboard.css` sets chart-location width 100% at max1099 but leaves a nonwrapping header and flex-shrink 0; at 1024px the selector extended to x608.65625 while its panel ended x502.40625. Override collapsed main grid after the tablet rule and wrap/stack plot headers for the relevant intermediate widths. Reported to owner; needs fresh served-build retest at 701, 760, 761, 800, 1000, 1024 and 1099px. Normal desktop/320px results above remain valid for their exact viewports.

## Modal retest

Fresh served-build independent retest after owner correction: Locations → Event snapshots → Locations → Run details now changes subtitle Eventual totals → Computed event snapshots → Eventual totals → Run provenance. Original scope-label finding closed. Owner reports new regression coverage and full frontend 116-test pass; evaluator independently verified the browser behavior, but did not rerun that full suite.

## Final responsive retest and disposition

Owner correction rebuilt successfully (owner ran lint/typecheck/116 frontend tests/production build). Independent fresh served-build retest passed 320, 701, 760, 761, 800, 1000, 1024 and 1099px widths. Every chart panel and chart selector stays inside the viewport; document scrollWidth equals viewport width. Tablet cards now use a readable single column and the location selector wraps inside the accumulation panel. Corrected 800px and 1024px screenshots were visually inspected. Desktop endpoints independently rechecked: 1366×768, 1440×900 and 1920×1080 again have matching document dimensions with no page scrolling. These corrections intentionally allow vertical scrolling at tablet/mobile sizes rather than clipping content.

Evidence: `final-responsive.json` contains exact card/selector/document bounds for all 11 viewports. Final screenshots: `output/playwright/dashboard-independent-final-800.png`, `dashboard-independent-final-1024.png`, `dashboard-independent-final-1920.png`. Earlier 800px screenshot is retained as defect evidence, not the final output.

**Both reported P2 findings are independently verified closed. No unresolved actionable findings remain in the tested scope.** Evidence limits above remain: this is scoped local QA, not exhaustive accessibility, GPU performance or historical scientific validation.
