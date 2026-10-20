# ABO dashboard reimagination

Design proposal, 17 October 2026. Application implementation is intentionally deferred for this image-reference review.

## Observed in the running app

Launched the existing built application with `scripts/start.ps1` at http://127.0.0.1:8000 and ran the selected Taal regional scenario. The scene renders terrain and the map loads regional boundaries. This is a visual and interaction review, not scientific validation or a graphics performance test.

The desktop already pairs the 3D and map views. The main problems are hierarchy and density: a persistent input rail, five equally prominent workflow tabs, expanded map layers, mismatched viewport top edges, a tall timeline above the spatial views, and numerical exposure overlays inside the scene. The opening state requests a run instead of presenting a dashboard. Below the views, eventual totals and the current-frame provincial breakdown refer to different times; at Before, the breakdown is zero while eventual totals are nonzero. Their time contexts need stronger separation.

## Palette and composition exploration, revision 3

The user requested a more modern, distinctive design and explicitly allowed other palettes. This exploration supersedes blue-only styling for the reference, without altering application styling or declaring the palette approved for implementation.

Candidate: limestone page (#F3F0E8), ivory plots (#FFFEFA), deep petrol navigation/actions/primary series (#173D3B), charcoal text (#202924), mineral dividers, and burnt copper (#A9472C) for the selected municipality. Copper indicates selection, never an unsupported hazard severity. Use flat fills, compact 4px radii, tabular numerals and strong typographic hierarchy. No decorative gradients, glass or repeated floating cards.

`dashboard-reference-v3.png` demonstrates this direction. Review: the palette gives stronger identity, the asymmetric chart hierarchy makes the main task clearer, and the shared lower ledger avoids four identical cards while retaining a compact screen. All quantities are explicitly synthetic; the sample ranking and distribution agree that four municipalities are at or above 5 mm. The generated image adds subtle mottling/gradient-like fill; implementation should use solid colors. Reduce the heading/subtitle area for smaller desktop viewports, add an explicit visible Scenario label, and show the location selector label once rather than repeating Laurel in the subtitle. Keep plain descriptive chart titles if question headings become visually verbose. Numeric font styling should remain restrained.

Basic sRGB contrast calculation for proposed exact tokens: charcoal on limestone 13.13:1; ivory on petrol 11.78:1; copper on ivory 5.74:1. These cover only those token pairs, not all raster labels, chart boundaries, focus states or actual implementation. Distinguish selection by label/marker as well as copper color. Actual desktop fit, responsive layout and keyboard behavior remain unverified design gates.

Make a selected-location accumulation chart dominant (about 62% width), with a narrower municipal ranking alongside it. Replace the repeated four-card composition with a short full-width deposit-distribution and scenario-context ledger below. Keep the preset dropdown and raw-data access compact in the heading. All plots and counts in the image remain explicitly synthetic. This design still targets a one-screen desktop dashboard and keeps spatial simulation on its own page. Actual contrast, focus, responsive fit and chart semantics require implementation checks.

## Current direction: dashboard and simulation are separate

The user's revision supersedes the combined dashboard proposal below. The dashboard opens first and contains only graphs and data, with a preset scenario dropdown. All spatial simulation belongs on a separate Simulation page. Minimize page scrolling without shrinking labels or clipping content.

### Dashboard

- Compact navigation: Dashboard, Simulation, Analysis, Sources.
- One heading/control row: Dashboard, labelled scenario preset dropdown, View raw data.
- One short metadata line identifies illustrative inputs, completed-run scope and relevant reporting context.
- At 1440 × 900, target two content rows within one viewport: municipal thickness ranking and a selected-location event-time series above; municipality counts by deposit band and concise scenario details below. Use only backend-computed quantities. No map, 3D scene, playback, parameter form or Run action appears here.
- Default to eventual totals. The event-time chart explicitly describes the complete calculated series, independent of the paused Simulation replay. Do not make Dashboard values silently follow playback on another page.
- Selecting a bundled preset loads its calculated results using the existing local backend; show an honest loading state. Cache completed results by exact scenario and reporting settings for reuse within the session. A preset is not a historical validation claim. Failed selection must not relabel old data as the newly selected preset. Custom runs from Simulation appear as a clearly named current custom result.
- Keep ranking to a readable top-N subset; disclose the subset and current filter. Full records, search, sorting, exports, event snapshots and provenance belong in the raw-data modal. Municipality counts must use mutually exclusive, explicit deposit bands and separately report missing/outside-domain coverage.

### Simulation page

- Retain the paired 3D illustration and map with aligned headers/toolbars/viewports, a compact scenario strip and Edit parameters drawer.
- Put the single shared playback row below the paired views; fold layers and technical explanations. Keep large result tables off this page, with access to Dashboard instead.
- Preserve completed scenarios and selected locations across navigation; pause playback when leaving Simulation. Mount the GPU-heavy scene only on Simulation and preserve its camera state if practical without retaining animation activity.

### Scroll and responsive rules

- A one-viewport dashboard at 1440 × 900 is the desktop target, not a promise for every screen. At 1366 × 768, prefer fewer visible ranked rows and tighter spacing while retaining readable text. Chart expansion opens a dialog rather than lengthening the page.
- Do not use fixed page heights or overflow hiding that clips content. At narrow widths or enlarged text, stack charts and permit necessary document scroll. Modal tables have one bounded scroll region, keyboard access, Escape close and focus restoration. No nested scrolling on the main dashboard.
- Verify the small desktop viewport, 200% zoom, 320px width, both themes and empty/loading/error states during implementation. Generated imagery cannot establish these behaviors.

### Revised image evaluation

`dashboard-reference-v2.png`, generated with the built-in image tool, follows the revised separation: only graphs/data and a preset selector on Dashboard, with Simulation in navigation. Two rows fit the image viewport without a sidebar or page scrollbar. The selected-location series and raw-data action are clear. This is a useful composition reference, not proof of responsive fit.

Before implementation: reduce the unusually wide scenario selector; keep its preset name readable with more balanced header spacing. Darken metadata/footer text to verified contrast. Use flat chart fills instead of generated gradients. Specify nonoverlapping band endpoints (for example 0.01 ≤ t < 0.5, 0.5 ≤ t < 1, 1 ≤ t < 5, and t ≥ 5 mm), with below-trace and unknown/outside-domain counts available in details. Never use the generated numerical marks as computed output. The image's top four values and its ≥5 mm count are inconsistent; all implemented summaries must derive from the same completed receptor dataset and filters. Exact generation text is retained in `dashboard-v2-prompt.txt`.

## Earlier combined-layout proposal (superseded)

1. Dashboard opens first. Use one compact scenario strip with preset, input classification, Edit parameters, and Run simulation. Move the full input form to an accessible side drawer grouped into Eruption, Wind, and Advanced model settings. Keep one primary Run action.
2. Make the 3D illustration and quantitative map the dominant, equal-width desktop pair. Align headings, toolbars, viewports and captions. Give each view a fullscreen action. Fold map layer checkboxes into a Layers popover. Move exposure tallies out of the 3D canvas. Keep scale qualifications, units, attribution and scientific meaning accessible.
3. Put one shared event timeline immediately below the pair. Use a compact playback row, stage selection and one current-event-time label. Keep the explanation of smooth scene interpolation versus discrete computed map snapshots in a disclosure. Do not imply frame-exact map interpolation.
4. Place charts below the spatial workspace. Start with ranked municipal deposit thickness and accumulated deposit over event time for a selected location. Offer load as an alternative metric, not another permanent chart. Keep threshold, census year, inventory coverage and unknown-value explanations near relevant results. No fabricated hazard score or safety classification.
5. Provide a View raw data dialog from the results section. Include Locations, Event snapshots, and Run details tabs; location search, sorting, units, current filter, row count, CSV export, and result provenance. Represent unavailable and outside-domain values explicitly. Distinguish zero from unknown. Show the completed scenario and time scope in the dialog heading. On narrow screens use a fullscreen dialog, with keyboard-scrollable tables.
6. Put wind comparison, wind sweep and historical reference under Analysis. Keep each workflow available without showing its controls on the opening dashboard. Sources contains scientific methodology, provenance and detailed model limits.

## Initial and subsequent states

- First visit: show the dashboard shell, actual terrain/geography, a paused scene, and chart empty states saying Run simulation to calculate results. Do not manufacture charts to make the dashboard appear populated. A later implementation may restore a deliberately saved completed run with its provenance; that is separate from this proposal.
- After Run: show the completed scenario and results. Default the dashboard evidence to eventual totals with an explicit label; keep the replay paused at Before. A clearly labeled Current snapshot / Eventual totals scope control governs chart interpretation. Never silently mix the two scopes.
- Editing inputs: preserve the completed run, mark it as out of date, and identify the draft separately. Error and cancellation retain completed data. Changing the visual theme does not restart calculation.
- Small screens: stack scene and map, retain the shared timeline beneath them, then stack charts. Collapse secondary controls before shrinking plot labels. Dialog focus returns to its invoking control.

## Chart data boundaries

Municipal bars come from the completed simulation receptor results. A time series comes from backend-provided eruption snapshots at the selected receptor, with actual nonuniform event times on the x-axis. The current contract was checked: `EruptionFrame` supplies `elapsed_s` and `receptors`, with nullable `thickness_mm` and `load_kg_m2` on `ReceptorResult`. These support the proposed selected-location chart without adding physics to React or changing the API. Preserve missing samples as gaps; do not interpolate new scientific results in React. Expose model deposit and historical observations as separate series only when supported by reviewed data. Population counts describe centroid classification, not measured individual exposure. Charts cannot replace provenance or raw evidence.

## Visual direction and review loop

Retain navy/cobalt identity, Segoe UI, cool neutral surfaces, restrained borders and radii. Use strong typography and geographic content for identity. Reserve warm colors for the quantitative deposit scale; use blue for controls and selection. Avoid repeated metric cards, decorative animation, oversized titles, permanent form walls and dense toolbars.

Review each generated reference for: immediate dashboard recognition; spatial-panel alignment and useful size; graph readability and explicit units; discoverable raw data; clear current/eventual time scope; scientific honesty; and achievable responsive behavior. Image generation only establishes a visual direction, not working interaction, contrast compliance or accessibility.

Before implementation, resolve any layout defects seen in the image and record them here. During implementation, inspect normal, empty, loading, stale, failed and unavailable states; both themes; 320px layout; keyboard dialog focus/Escape/return; reduced motion; raw-data filtering/export; and synchronized selected location/time. Run repository-required Python/frontend/contract checks only when application code changes.

### Reference review, pass 1

`dashboard-reference-v1.png` was generated with the built-in image tool. It meets the intended composition: compact scenario strip, aligned dominant spatial pair, one timeline, two readable graphs below, and a visible raw-data action. It preserves blue controls and distinguishes illustration from quantities.

Required refinements: the terrain is too photorealistic to promise from the current renderer; use the existing scientific mesh as the implementation baseline. The mock map is schematic and cannot supply geography or scientific contour assets. The 24-hour timeline and chart numbers are generated design samples, not a run result. Add an explicit current-snapshot/eventual-totals scope control. Prefer a selected-location time series over four default lines. Replace ambiguous cube/magnifier controls with only actual supported actions and accessible names. Chart availability depends on the real backend contract. The image is a desktop composition reference; mobile, dark theme, contrast and keyboard behavior are still unverified.

### Generation brief

### Reference review, pass 2

`raw-data-modal-reference-v1.png` demonstrates a readable detailed-data dialog with scope, census year, search, domain filter, units, CSV export and unavailable-value explanations. It keeps the dashboard visible behind the focused task. The sample rows are deliberately marked schematic and have no fabricated numeric results. Keep the dialog tabs. Remove the redundant provenance disclosure from Locations because Run details already owns that information. The generated image adds an Unknown municipality sample row; implementation must render actual catalog entries only. The background remains too photographic and the mock image cannot verify geographic accuracy or functioning focus/scroll. Use the current terrain renderer in implementation and test dialog keyboard behavior. The two close affordances are conventional; retain the top accessible close action, with a footer close only if long scrolling makes it useful.

Built-in image generation; use case `ui-mockup`. Dashboard prompt: a high-fidelity light ABO scientific dashboard, navy/cobalt and Segoe UI, no heavy input sidebar or metric cards; compact scenario/Edit parameters/Run strip; equally aligned Taal 3D illustration and quantitative map; one shared timeline; ranked municipal thickness and event-time deposit charts below; View raw data action; conspicuous schematic-preview and academic-limit labels. The modal iteration uses the dashboard image as reference and focuses on Locations/Event snapshots/Run details, location/domain filters, CSV export, unavailable/outside-domain semantics and completed-run provenance. Generated imagery is reference material only, never simulation evidence.

## Planned implementation surface

`frontend/src/Workspace.tsx` owns default navigation, scenario controls, completed-run state and results composition. Existing `VolcanoScene.tsx`, `GeographicMap.tsx`, `EruptionTimeline.tsx` and `ProvincialExposureExplorer.tsx` need coordinated layout and scope review. Shared styles, accessible dialog/drawer components and focused chart components would be added or adjusted after dependency inspection. Backend contracts remain authoritative. Preserve the existing uncommitted manuscript and repository-map changes.
