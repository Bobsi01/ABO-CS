# Engineering gap evidence — 11 October 2026

The engineering specialist saved implementation and test tools before reaching the account usage limit. The independent evaluator saved scientific audits and browser cases before encountering the same limit. The orchestrator completed the final production-build timing, ran the saved independent browser cases, checked scenario exports and consolidated this record. An independently authored test run by the orchestrator is not a replacement for an independent final review.

## Implemented changes

- `Workspace.tsx` propagates selected census year and screening context through simulation, eruption and wind comparison. Scenario JSON exports the completed request's context, including after unsent parameter edits. Historical evidence panels expose the frozen protocol, dependencies, both derived contours and unavailable reasons.
- `VolcanoScene.tsx`, `ScientificViewBoundary.tsx` and the shared timeline pause replay after terrain, renderer or context failures. Computation, completed map/table results and export controls survive; recovery is explicit and does not autoplay.
- `rendererLifecycle.ts` restores renderer wrappers and material hooks on retirement and reference-counts Three's shared DFG lookup texture. Compass sprites own their geometry. A two-live-renderer regression protects the valid shared-resource case. The stronger original retained-renderer path was corrected; the broader cleanup finding below remains open.
- Runtime validation accepts the Python contract's Polygon/MultiPolygon reference geometry in either a Feature or FeatureCollection, rejects malformed coordinates and normalizes map overlays. Generated Python/OpenAPI/TypeScript contracts remain authoritative.
- Quantitative Leaflet vector paths are excluded from the accessibility image tree. Named map controls, location inspection, popups, numeric legends and the HTML exposure table remain available. This removes hundreds of unnamed decorative vector images without hiding the equivalent location workflow.

The recorded full frontend checks pass 56 cases, ESLint, TypeScript and the production build. Final assets include `index-lYFWRuYY.js`, `VolcanoScene-C1DAPjel.js` and `GeographicMap-HlpoTIBu.js`.

## Recorded performance

Machine: AMD Ryzen 7 5800U, integrated Radeon graphics, approximately 14.88 GiB RAM, Windows 10.0.26300; Chrome 155.0.8059.39 / ANGLE Direct3D 11. Both campaigns load the final production bundle, Mayon teaching preset with default lava enabled, close-up, normal detail, 1440 × 1000 viewport and device pixel ratio 1. No animation scheduling flags were applied to the performance campaign. Raw animation callbacks and rendered timestamps were saved separately.

| Browser | Warm-up minimum fps | Measured replay minima, steady 10-second windows | Render frame-time p95, measured runs |
| --- | --- | --- | --- |
| Chrome | 29.7 | 51.2 / 59.4 / 59.8 | 31.0 / 24.5 / 22.2 ms |
| In-app browser | 59.3 | 58.5 / 58.7 / 58.9 | 26.2 / 24.9 / 24.1 ms |

All six measured replays meet the requested 30 fps threshold on this machine. Chrome had 17/17 matching native foreground samples; the in-app campaign had 8/8. The native foreground process was confirmed by its file product name, Codex, although its process name is ChatGPT. Page focus and visibility were also recorded. Foreground ownership is sampled, not continuously traced. Chrome replays 2 and 3 overlapped an earlier in-app warm-up; the subsequent in-app campaign was sequential. These limits prevent treating the numbers as a universally reproducible hardware benchmark.

The minimal baseline contains an animation callback and empty WebGL clear with no React, solver or terrain. Chrome recorded 333 renders over approximately 10 seconds (median gap 33.3 ms); the later in-app baseline recorded 601 callbacks and clears. The earlier 1 fps Chrome observation is superseded by these final-build results, not erased from historical reports.

Evidence: `qa/browser/gap-engineering-performance.json`, `gap-iab-replay-0.json` through `gap-iab-replay-3.json`, `gap-iab-baseline-final.json`, `gap-iab-foreground-*.json` and `gap-performance-summary.json`. Regenerate the summary with `uv run python ../qa/browser/summarize_gap_performance.py` from `backend/`.

## Lifecycle and resource finding

`qa/browser/gap-engineering-soak.json` completed 1823.588 seconds, 20 actual volcano/run/view cycles, 38 full replays and 98 resource snapshots, with zero JavaScript errors. All 38 sampled paused windows rendered zero additional frames. Retired GL contexts report context loss, and their tracked buffers/vertex arrays were deleted. Context retirement releases other GPU resources even when explicit deletion counters do not balance.

| Post-collection snapshot | JS heap | DOM nodes | Event listeners |
| --- | --- | --- | --- |
| After cycle 1 | 30,880,108 bytes / 29.45 MiB | 11,692 | 1,475 |
| After cycle 20 | 37,677,444 bytes / 35.93 MiB | 20,121 | 2,383 |
| Final | 62,592,292 bytes / 59.69 MiB | 20,333 | 2,396 |

The substantial original renderer retention was reduced. Node/listener counts nevertheless rise during remount cycles, then stabilize through the remaining replays; final heap also increases. Instrumentation is a possible contributor but does not explain away the result. **The full cleanup gate remains open**, requiring attribution of retained objects and a correction/retest if they are application-owned. No blanket leak-free PASS is assigned.

This resource soak disables background/occlusion throttling to maintain continuity; it is separate from the default-flag foreground benchmark. It loaded `index-W6Ud_uGT.js`, before the final map accessibility-only revision. The renderer/lifecycle code is unchanged between these builds. A strict final-bundle soak has therefore not been claimed.

## Final browser retests and limits

`qa/browser/gap-final-retest.json` runs independently authored saved cases on the final bundle under the orchestrator, then an additional completed-request export check:

- Actual WebGL context loss while the clock had advanced to frame 3 pauses the shared timeline, preserves completed results/map and requires explicit recovery.
- A thrown native GL clear exercises renderer recovery. WebGL 2 denial and a real terrain HTTP 503 preserve computation/map/table/export controls; schematic fallback and restored terrain recover explicitly.
- A real reduced-motion media change pauses replay; restoring the preference does not autoplay.
- Keyboard custom-select opening, Escape/focus return and camera rotation pass. Both 320 px themes fit the viewport; numeric legend labels provide non-color meaning. The final accessibility tree has one unnamed image and 345 named controls. Actual screen-reader speech is unperformed.
- The 200% check is a CSS zoom reflow proxy, not native browser zoom. The real hidden-page attempt did not produce `document.hidden = true`, so that lifecycle gate is unestablished despite passing mocked visibility tests.
- After a completed 2020 run, an unsent change to 2024 leaves Scenario JSON at 2020 with its screening context. The export is saved as `gap-final-completed-scenario.json`. The first runner attempt incorrectly waited on the old visible Play button; its 2024 export correctly represented the earlier completed run. The corrected runner waits for the new response and loading completion. Initial evidence is preserved separately.

Final screenshots are `qa/browser/gap-final-desktop-light.png`, `gap-final-320-light.png`, `gap-final-320-dark.png` and `gap-final-css-zoom-200.png`. Every unavailable check remains visible in [GAP_REGISTER.md](GAP_REGISTER.md).
