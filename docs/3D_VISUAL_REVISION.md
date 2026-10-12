# Eruption illustration review — 12 October 2026

## Status

Overall engineering/3D QA is **not complete**. The user rejected the previous visual output and selected a more convincing scientific illustration with clearer flow and texture. This report is an orchestrator review and implementation record, not a new independent evaluation. No specialist is currently running in the recovered session.

The previous engineering campaign tested performance, graphics recovery, exports and keyboard workflows. It did not establish user acceptance of the eruption appearance. Graphics cleanup, an actual hidden-page transition, native zoom/speech accessibility and final independent review remain open in [GAP_REGISTER.md](GAP_REGISTER.md).

## Observed problems and corrections

| Observed limitation | Correction |
| --- | --- |
| Repeated sphere lobes made smoke and ash appear as rigid stacked tubes | Instanced, soft-edged procedural cloud sprites with irregular opacity and stable detail |
| Ash was difficult to distinguish from the source cloud | Separate sparse, enlarged grain markers; size follows submitted grain diameters, including reordered classes |
| A thick lava tube could intersect the ground at its enlarged sides | Surface ribbon samples the backdrop's exact triangle split and detail stride, using the reached Python route |
| Looking directly along Mayon's lava route compressed its visible length | Camera stays on the routed slope's side at a 36° oblique angle |
| Taal's source-column top was crowded by the frame | Slightly wider framing and a higher focal target; island relief stays labeled ×6 |
| Strong ambient light washed out terrain relief | Lower ambient lighting and an angled directional source reveal the existing DEM normals |

## Computation boundary

Python still supplies plume parcel centers, horizontal spread, grain identities, source height, lava coordinates/arrival times and quantitative map footprints. React converts metres to scene kilometres with east on X and north on negative Z. It interpolates supplied values and adds labeled visual cues.

Cloud opacity and texture are artistic. The source-column bend uses the returned wind vector, relative column height and prescribed rise-speed setting with a bounded display factor; it is not a buoyancy/entrainment calculation. Sparse marker offsets are deterministic detail around cohort centers, not independent particle trajectories or new diffusion. The ribbon preserves the route and moving front; its minimum 130 m display width, 4 m surface offset and crust/core colors have no effect on the map, exposure or numerical model. Colors do not predict cooling times.

The interpretation distinguishes wind-transported ash from gases and source appearance, consistent with [USGS ash and gases](https://volcanoes.usgs.gov/volcanic_ash/ash_gas_vog.html) and [USGS eruption styles](https://volcanoes.usgs.gov/volcanic_ash/eruption_styles.html). These references guide illustration, not validation of ABO. No new Taal/ Kanlaon downslope lava path, pyroclastic flow, gas chemistry or CFD solver was introduced.

## Verification

- 142 Python cases pass, along with Ruff checks/formatting. Numerical code and datasets are unchanged.
- 60 frontend cases pass, along with lint, TypeScript and the production build. Four added cases check terrain triangle sampling, a ground-following ribbon that stops at the supplied front, reordered grain diameters and soft texture boundaries.
- Regenerated OpenAPI JSON and TypeScript contracts have no diff.
- Final production assets: `index-DwUPOPRZ.js` and `VolcanoScene-SpTLmQDm.js`.
- In-app browser checks cover Taal and Mayon before/during/after, clear source before emission, gray cloud/ash markers during emission, the reached lava surface, stopped source and retained deposits afterward, explicit playback and console errors. Images and raw replay evidence are in `qa/browser/3d-visual-2026-10-12-*`.
- Final-assets scoped replays at the current 629 × 693 pane completed 1,951 rendered frames for Taal and 2,097 for Mayon. Minimum steady 10-second windows were 51.9 and 57.3 fps; frame-gap p95 was 38.8 and 30.1 ms respectively. No browser console errors were recorded. Raw callbacks/rendered timestamps are preserved in `3d-visual-2026-10-12-evidence.json`; this is one replay per volcano without independent native foreground sampling.

Raw timing and its measured viewport/settings belong to this scoped check. They do not replace the prescribed three-replay, matched-settings Chrome/in-app foreground campaign or a 30-minute final-bundle cleanup soak. The 11 October performance PASS remains evidence for its previous bundle only.

## Arrow and time clarification — 12 October 2026

At the user's request, the wind arrow has an attached **Wind / ash transport** label that follows its projected tip while orbiting. It avoids the volcano HUD on narrow layouts and cleans up on unmount. The timeline and map use elapsed `h:mm:ss` without wrapping at 24 hours, and the timeline distinguishes emission duration, full model horizon and the 36-second accelerated replay.

The default preset emits for `1:00:00` and reaches eventual settling at `27:54:35`; this does not imply an eruption lasting almost 28 hours. Snapshot spacing is nonuniform rather than hourly. Current checks pass 142 Python and 61 frontend cases. Final annotation assets are `index-BdSPQSOW.js` and `VolcanoScene-MHNgxiLf.js`; `qa/browser/arrow-time-2026-10-12.json` and its normal/320 px images record visible camera-following labels, matching map/time readouts and no browser console errors. This small follow-up does not close the broader graphics QA gates.

## Remaining work

Independent final visual review and user acceptance are pending. The bounded cohort illustration remains an approximation: it is neither volumetric plume CFD nor an airborne ash forecast. Full graphics retention/cleanup, actual hidden-page lifecycle, native accessibility checks and the scientific source/empirical-validation gaps remain open. The research manuscript and scientific results were preserved; a more convincing image does not establish predictive accuracy.

The display still uses a bounded set of cloud cohorts, so distinct puffs can remain visible in a close-up, particularly downwind. That is a remaining visual approximation, not a claim that a real plume separates into these exact forms. The current correction improves softness, grain distinction, terrain contact and framing; it does not close final artistic acceptance automatically.
