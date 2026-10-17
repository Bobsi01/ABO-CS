# Independent dashboard release verification, 17 October 2026

Disposition: **Verified ready within the tested dashboard/UI scope. No unresolved actionable findings.** This independent reviewer did not modify implementation, manuscript, curated inputs or unrelated task artifacts.

## Fresh evidence

- Focused Vitest run: Dashboard, dashboardData and Workspace, 3 files / 9 tests passed. This is a fresh run, not reliance on an earlier suite count.
- Fresh served Chromium at http://127.0.0.1:8000: 1920x1080 and 1366x768 document dimensions exactly match viewport dimensions, without page scrolling; no Dashboard WebGL canvas.
- Widths 701, 800, 1024, 1099 and 320: document width equals viewport; all chart panels and chart-location selectors stay within viewport. Tablet layout uses readable stacked panels. Necessary vertical scrolling remains on tablet/mobile. The mobile accumulation graph intentionally scrolls inside its named keyboard-focusable region.
- Fresh screenshots visually inspected: dashboard-1920.png, dashboard-dark-1920.png, dashboard-800.png, dashboard-320.png. The navy accumulation plot is the clear focal point, supporting ranking/distribution/ledger have distinct hierarchy, and text/controls remain contained.
- Raw dialog Locations -> Event snapshots -> Locations -> Run details independently verified subtitles Eventual totals -> Computed event snapshots -> Eventual totals -> Run provenance. Prior misleading-scope finding is closed.
- Selecting Talisay gives 24.13 mm; filtered Laurel table has one row and its CSV preserves 19.85037077245691 mm and provenance. Escape closes dialog and restores View raw data focus. At 320px modal stays within viewport with no dialog horizontal overflow; table retains its own scrolling.
- Injected HTTP503 hides previous charts and disables raw data. Retry after removing injection succeeds with Mayon's own 34/320 coverage. Delayed Taal calculation followed immediately by Mayon does not overwrite selection/results. No page errors in main browser run.
- Fresh real Simulation run: scene and map top edges differ by less than one pixel, equal heights. Returning to Dashboard unmounts all canvas elements.
- Missing/zero/outside semantics reviewed in source and freshly executed boundary fixtures: disjoint municipal bands, known denominator, explicit exclusions; unavailable samples are gaps, not zeroes.
- New review scripts use checkout-relative Playwright runtime resolution and __dirname evidence outputs. Prior selected dashboard QA scripts use portable runtime resolution and documented repo-root-relative outputs. No author home directory, credential or session cache in selected dashboard source/report/scripts. Frontend diff whitespace check passes.

## Artifacts and limits

verify.cjs and results.json record primary assertions; extra.cjs and extra-results.json record mobile-modal and real-simulation assertions. Representative screenshots are in this same directory. Reports retain historical failed-state evidence clearly labeled as such; no earlier failed screenshot is represented as final.

This is scoped local browser/source/test evidence. Full frontend/backend/repository gates are the implementation owner's release responsibility. No historical scientific accuracy, production deployment, exhaustive accessibility, native screen-reader/browser-zoom, hardware/GPU performance or long graphics-soak certification is claimed. Visual preference remains subjective. Unrelated manuscript/data/QA changes are excluded from this review and should remain outside the dashboard publication commit.
