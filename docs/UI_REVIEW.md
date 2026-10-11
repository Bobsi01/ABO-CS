# Blue UI and redundancy review

## Further independent review, 2026-10-10

Two fresh QA roles reported nine findings across numerical/data/UI behavior. The UI owner independently retested hidden-field recovery, effect-specific counts, scenario-specific fountain text and terrain/lava scale labels, then reported faint compass letters during image review. The orchestrator corrected the compass using opaque white backplates, sRGB ink and fog/tone-independent materials, calculated 11.40:1 ink/backplate contrast and inspected the final desktop/mobile views. Four new UI fixtures and the complete 47-test frontend check pass. Final production screenshots are `qa/browser/further-mayon-desktop.png` and `further-mobile-dark.png`; the narrow document remains 310 px within 320 px. The orchestrator measured 60 fps on the final in-app build, while independent Chrome measured 1 fps with an unresolved pacing cause. [FURTHER_UI_QA.md](FURTHER_UI_QA.md) preserves the evaluator's handoff state and valid counterexamples; [FURTHER_QA.md](FURTHER_QA.md) records final integration evidence and correction attribution. Earlier observations below retain their dated build context.

## Eruption extension delivery gate, 2026-10-10

The added timeline has one stage selector, one changing Play/Pause/Replay action and one slider. Camera reset serves spatial framing; it does not rewind time. The scene's former player disappears when a sequence is active. Lava assumptions and source/reference details stay folded; the map effect selector replaces competing overlays. Table/CSV label eventual quantities, while the inspector labels selected-time quantities. Scene and map remain side by side on desktop and stack on mobile. See `ERUPTION_QA.md` for scientific and browser evidence.

Actual IAB inspection covered 1440 × 1000 and 320 × 800 in light/dark themes; document width was 310 px on the narrow viewport. Measured light text ratios: primary 14.27:1, secondary 5.94:1, action 6.27:1, selected 5.40:1; scene caption 9.72:1. Dark ratios: 14.13, 9.62, 8.62 and 6.20 respectively. These token checks and visual inspection are scoped evidence, not complete WCAG certification. Screenshots: `qa/browser/eruption-mayon-desktop.png`, `eruption-taal-desktop.png`, `eruption-mobile-dark.png`. The final built workspace was loaded from Vite's current hashed assets; console inspection found no application errors.

Mandatory anti-slop gate, scoped to the new interface and supported by the existing full-workspace review below:

- R-02 PASS: targeted source/catalog scan contains no em dash; UI copy uses precise units and stage names.
- R-03 PASS: 320 px document width 310 px, wrapping timeline and stacked spatial views.
- R-17 PASS: displayed counts/loads derive from Python; replay fps is measured with its window stated.
- R-18 PASS: no testimonial or fictional person exists in this workspace.
- R-23 PASS: user authorized icons and 3D; geography is sourced and display enlargements are labeled.
- R-24 PASS: navigation opens implemented workflows; documentation and source links resolve to recorded targets.
- R-25 PASS: scoped light/dark text ratios above exceed 4.5:1; earlier review covers other shared tokens.
- R-26 PASS: stage/player/slider, camera, effect/extent/reset, lava fields, reference toggle, inspector and exports have implemented actions exercised in browser or component cases.
- R-27 PASS: real loading state, invalid/failed-request tests, preserved completed results and renderer fallback.
- R-28 PASS: no generic FAQ was added; sources/effects content explains this model.
- R-32 PASS: keyboard stage/slider and custom camera/scenario selection work; focus styles are retained.
- R-33 PASS: source changes use source patches; generated contracts use the documented generator.
- R-34 PASS: actual light/dark desktop/narrow layouts remain functional.
- R-35 PASS: app runs locally; production build and 43 frontend tests pass; new control classes were exercised.
- R-36 PASS: measured performance and synthetic evidence are separated from unvalidated forecast claims.
- R-37 PASS: approved blue workbench direction and ENERGY 2 / RHYTHM 2 / MOTION 2 recorded in `DESIGN.md`.
- R-38 PASS: physical presets, plume/fountain shape and cooling cues are explicitly illustrative.
- R-01 PASS: no default gradients; scientific color encodes quantities and stage cues.
- R-04 PASS: calculation, wind, camera, map, playback and export icons match actions; no decorative generic icon.
- R-06 PASS: existing Segoe UI matches Windows scientific controls; no decorative type treatment added.
- R-07 PASS: no decorative background grid added; map coordinates/geometry carry actual context.
- R-08 PASS: arrows serve wind direction or existing navigation, not decorative CTA repetition.
- R-09 PASS: academic status explains limitations; no invented promotional badge.
- R-10 PASS: translucent billows illustrate plume material; UI uses solid panels and no glass surface stack.
- R-12 PASS: panels stay flat; elevation is confined to selectors/disclosures.
- R-13 PASS: emissive lava/fragments identify the requested teaching mechanism; no UI glow.
- R-14 PASS: timeline, paired spatial views and folded evidence have distinct content-driven roles.
- R-19 PASS: motion starts paused, user controls playback, hidden/preference handlers pause it.
- R-22 PASS: source-based volcano geography and bounded eruption illustration serve the project.
- Liveliness dials PASS: ENERGY 2 / RHYTHM 2 / MOTION 2 match the workbench and user-started sequence.
- Focal point PASS: the shared timeline and dominant spatial pair direct interpretation.
- Whitespace PASS: input rail, timeline, spatial views and folded results have separate structural spacing.
- Accent PASS: blue identifies actions/selection; quantitative and lava colors have separate scientific roles.
- Identity PASS: volcano/wind/geographic motif follows this project's actual content.
- Design Read PASS: recorded in `DESIGN.md` before integration changes.
- C-1 PASS: camera orientation, translucent billows and display widths have recorded purposes.
- C-2 PASS: control classes have real behavior and appropriate disabled states.
- C-3 PASS: every added section supports computation, illustration, inspection or provenance.
- C-4 PASS: scoped narrow/theme/keyboard/failure checks pass; hardware evidence limits are recorded.
- C-5 PASS: no historical agreement, damage or operational safety is fabricated.
- R-05 PASS: composition follows event inputs, timeline, spatial consequences and inspectable evidence.
- R-11 PASS: existing control/frame radii are retained, without pill treatment.
- R-15 PASS: actions state Run, Play, extent, inspect and export.
- R-16 PASS: no AI marketing language added.
- R-20 PASS: dated volcano references, physical units and shared eruption clock are project-specific.
- R-21 PASS: theme choice remains available and both were inspected.
- R-29 PASS: blue/navy/cool-neutral UI; quantity and material colors are explicitly separate encodings.
- R-30 PASS: no borrowed product layout or stock marketing sections.
- R-31 PASS: major changes have one-line purposes in this review and `DESIGN.md`.

Gate status: PASS for the reviewed interface scope. Scientific predictive-validation gates remain open, as documented in `ERUPTION_QA.md`; this UI gate cannot close them.

## Taal visibility refinement — 2026-10-10

The user requested a larger volcanic representation. The close-up now enlarges only local Taal land relief 6× relative to the historical lake surface, with a smooth return to normal relief outside the island. Horizontal geometry, water, source files and computed quantities remain unchanged. A closer, higher camera reveals the source-shaped crater and includes the full teaching column. The existing Regional overview selector restores 1:1 relief; no extra control was added. The HUD explicitly states the enlargement, and source details explain it.

`npm run check` passed lint, TypeScript, **34 frontend tests** and production build. Tests verify water/source preservation, unaffected distant terrain/other volcanoes, and switching between labeled enlargement and true-scale overview. Packaged terrain checks still pass. The actual IAB loaded `/assets/index-CkPlhQaf.js`; desktop inspection at 1440 × 900 confirmed the enlarged island/crater and complete column. Regional switching left the impact-map content unchanged. Camera reset, replay/pause and both themes were exercised. At 320 × 800, document width was 310 px and the crater/scale label remained visible. Console inspection showed no application errors. Temporary viewport overrides were reset and the user's app was left on Taal close-up.

Focused anti-slop delivery gate:

- Hard gate PASS: real build and 34 tests; actual desktop/320 px layout, visible scale disclosure, keyboard camera selector, both themes and no browser errors.
- Purpose gate PASS: enlargement and camera changes serve the user's specific visibility request; source-shaped island remains the focal point and quantitative map colors retain their meaning.
- Liveliness PASS: the existing ENERGY 2 / RHYTHM 2 / MOTION 2 direction is retained; enlarged crater relief supplies the focal point without autoplay or decoration.
- Craftsmanship PASS: the existing camera selector restores true scale; no duplicate button, new dependency or invented physical quantity was introduced. Replay and map remain usable.

Screenshots: `qa/browser/taal-enlarged-desktop.png` and `taal-enlarged-mobile-dark.png`. This is visual illustration evidence, not improved model calibration or current-survey certification.

## Geographic workspace completion — 2026-10-10

This later pass supersedes the build/test counts in the archived blue-palette review below. The orchestrator exercised the actual in-app browser; independent numerical, data and selector evidence is recorded separately in `IMPLEMENTATION_QA.md`.

- The opening Simulation view pairs source-traced 3D terrain with the quantitative impact map. Narrow screens stack the views. Five main inputs remain available; advanced inputs, the location table, historical reference tables and explanatory guides are disclosures.
- Geographic elevation uses true horizontal/vertical scale. Taal Lake now shares a cached OSM polygon and native island holes between map and terrain. Python paths retain their flat-ground interpretation and use a shared physical replay clock; terrain does not change ash physics.
- Custom blue selectors support keyboard navigation, typeahead, disabled choices and a bounded scrolling menu. Scrollbars match both themes. Camera, playback, reset and map-fit actions remain distinct. Redundant wind-unavailable labels, repeated historical explanations and repeated table warnings were removed; unknown sweep angles carry no degree suffix.
- A browser freshness defect reused old mutable geography after rebuilding. Terrain and geographic-context fetches now bypass that cache. The corrected lake and ODbL attribution were visibly verified after reload.

`npm run check` passes lint, TypeScript, **32 tests across nine files** and production build. The final cleanup build entry is `/assets/index-Y7ogS8-l.js`; the lazy 3D chunk remains approximately 951 kB minified / 252 kB gzip and produces Vite's size warning.

Actual IAB runs completed for Taal, Mayon and Kanlaon. At **1440 × 900**, document width was 1430 px. At **320 × 800**, document width was 310 px; paired panels stacked at 278 px and inputs collapsed after a successful run. The 124-option location list had a 280 px scroll container inside the viewport, with themed scrollbars. Both themes, scenario/camera selectors, regional/reset controls, map fit, stale-result retention and selected map/table records were exercised.

Tanauan's inspector and table both reported 0.16 mm, 0.16 kg/m² and 209,697 residents / 2024. A clearly manual Mayon case using 100,000 kg/s reported Malilipot at 3.71 mm, with one reporting centroid and indicative population 41,066; unavailable roof/crop criteria remained unknown. Manual wind comparison, the full sweep and historical unavailable status also completed. Taal replay measured recent windows of **42–45 fps** in the geographic build, compared with an earlier 60 fps window, and Play restarted a completed replay. These are observations on this machine, not universal performance guarantees.

Screenshots in `qa/browser/`: `geographic-taal-desktop.png`, `geographic-mayon-desktop.png`, `geographic-kanlaon-desktop.png`, `geographic-mayon-impact-dark.png`, `geographic-mobile-light.png`, `geographic-mobile-dark.png`, and the `geographic-mobile-*selector-*.png` menu evidence. Console inspection found no application errors; the dependency's existing `THREE.Clock` deprecation warning remains. Actual OS reduced-motion changes, forced graphics loss, long-duration GPU stability and credentialed MapTiler operation remain outside this browser pass. Photo references establish source guidance, not current survey accuracy or pixel-perfect photographic fidelity.

The final cleanup was reloaded and checked at `/assets/index-Y7ogS8-l.js`. Published reference tables start closed, each wind has one availability label, and the historical reason appears once. Final review artifacts are `qa/browser/final-geographic-workspace.png` and `final-in-app-geographic.png`. The browser viewport was restored to its normal 639 × 664 size (629 px document width), and the running simulator was left open with controls collapsed.

## Archived blue-palette pass

2026-10-10, Asia/Manila. Orchestrator implementation and browser review; this is not an independent scientific evaluation.

## Changes and purpose

- Blue/navy action and selection tokens replace the warm interface palette in both themes. Quantitative deposition colors are preserved.
- A compact header and view navigation give the actual simulation more screen space. Five event/wind inputs remain visible; secondary parameters use disclosures.
- One scenario selector replaces overlapping scenario/volcano selectors. Edited parameters show custom inputs, while the completed result retains its own wind and stale warning.
- One camera-view selector replaces two view buttons. Reset camera, replay and play remain separate because they change different state.
- Local SVG icons identify real navigation/actions. Icon-only buttons retain accessible names and tooltips. No icon library or runtime dependency was added.
- Shared model limits and inventory caveats appear in one expandable header panel, dismissible with Escape. Detailed completed-result provenance remains available below the table.
- The local anti-slop UI skill now includes a labeled project redundancy extension. Its original content and the copied core are retained.

## Verification

`npm run check` passed ESLint, TypeScript, 18 tests and production build. Final CSS corrections also passed TypeScript and production build. The existing lazy Three.js chunk-size warning remains.

Chrome exercised a real Mayon run, camera overview/close-up/reset, play/replay, reduced-detail toggle, stale wind edits, invalid grain fractions and recovery, offline map navigation, model limits and Escape dismissal. Invalid fractions produced an API error while the previous result remained visible. Restoring fractions and rerunning updated the result.

Both themes were inspected. At 320 × 800, document width was 305 px; the corrected camera selector measured 221 px, rather than shrinking to an unreadable arrow. Limits stayed inside the viewport. Input panels collapse after a successful phone run. Map zoom and row-action targets are at least 44 px high. Temporary Chrome viewport overrides were reset.

Configured foreground/background contrast ratios:

| Pair | Light | Dark |
| --- | ---: | ---: |
| Main text / surface | 13.16 | 15.76 |
| Secondary text / surface | 5.94 | 9.62 |
| Action text / action | 6.27 | 8.62 |
| Selected text / selected surface | 5.40 | 6.20 |
| Control border / panel | 3.27 | 4.45 |

Scene caption contrast is 9.72:1. These are configured-color checks and focused browser inspection, not complete WCAG certification.

The user's existing in-app browser was reloaded and completed Mayon in 23 ms. It loaded `/assets/index-CiSpHED9.js`, matching the final built entry. Its 639 px viewport had 624 px document width. Console inspection found no application errors; the existing Fiber/Three.js Clock deprecation warning remains.

Screenshots: `qa/browser/blue-ui-desktop-light.jpg`, `blue-ui-mobile-light.jpg`, `blue-ui-mobile-dark.jpg`, and `blue-ui-in-app.jpg`. Desktop and phone evidence comes from Chrome; in-app evidence is separate. Numerical and historical evidence limits remain in `VALIDATION.md`.
