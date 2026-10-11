# Independent UI, 3D and map QA - 10 October 2026

This is the second independent QA role requested by the user. The evaluator inspected the running application and authored isolated regression fixtures. The orchestrator changed implementation files. This record separates browser observations, component tests and scientific claims; a usable teaching illustration is not a validated eruption forecast.

## New findings and corrective evidence

| Finding | Severity | Reproduction and root cause | Resolution evidence |
| --- | --- | --- | --- |
| Hidden invalid advanced input blocked Run without explaining recovery | P2 | Mayon: expand **Eruption illustration & lava**, enter viscosity `0`, collapse it, press Run. Chrome reported native invalidity but left the section closed, focus on Run and no visible app alert. The form relied on native validation for a hidden field. | `Workspace.tsx` handles invalid capture, opens containing disclosures, names the field and native validation message, and focuses it. Actual Chrome retest: section open, viscosity focused, alert `Viscosity (Pa·s): Value must be greater than or equal to 1.` Restoring `1000` and running recovered the completed sequence. |
| Lava map summary displayed an unidentified ash count | P2 | Selecting **Lava channel · teaching model** retained `0 municipal centroids ≥0.5 mm` beneath a lava legend. This was the ash reporting count, not a lava intersection count. | `GeographicMap.tsx` now reports municipal point intersections from the current frame's lava IDs for lava mode, and explicitly names ash for ash mode. Chrome retest showed `Snapshot: During eruption · 31.4 min · 0 municipal centroids intersect the illustrative channel`. |
| Mayon guide described a Taal fountain absent from the scene | P2 | `VolcanoScene.tsx` displayed `fountain_label` for every eruption sequence, including Mayon with an empty fountain path array. | The guide conditions that text on actual fountain paths. Chrome Mayon retest contained its lava explanation and no Taal fountain description. Independent fixtures also retain the description for a Taal sequence containing paths. |
| Scene scale caption implied actual lava width | P2 | Mayon HUD said `Horizontal / vertical scale 1:1` while the illustration guide disclosed a lava ribbon enlarged to at least 130 m, compared with a 20 m prescribed teaching width. The scale wording was too broad. | Orchestrator narrowed the caption to **Terrain scale 1:1** and added **Lava width enlarged**. Final browser verification is recorded below. |

The map's **Snapshot** prefix additionally distinguishes its recorded quantitative frame from smooth interpolation of the qualitative 3D cloud/front between frames. The UI still uses Python-computed quantities; this change does not add a browser scientific solver.

## Independent fixtures

`frontend/src/furtherQA.test.tsx` checks that a native-invalid field in a closed disclosure is revealed, focused and named, and that a valid hidden field does not produce a false positive. `frontend/src/components/furtherSceneQA.test.tsx` checks both the absent Mayon fountain and the valid Taal fountain counterexample.

The evaluator ran `npm test -- src/furtherQA.test.tsx src/components/furtherSceneQA.test.tsx`: **4 tests passed in 2 files**. These mocks isolate the UI decision boundaries; they do not exercise a real graphics context or replace browser evidence. The orchestrator owns the complete frontend check and final combined test totals.

## Actual browser observations

The first browser inventory had no in-app tabs. An existing Chrome ABO tab still held an older Ashfall laboratory bundle. Reloading it exposed the current Eruption laboratory, rather than treating its stale page as a defect in the latest source.

- **Taal before/during:** the island and crater were visible; the local relief label stated ×6. The during view displayed the orange fountain, labeled ×4, ash/condensed-steam billows and the meteorological wind value. Stage seeks paused the sequence. The cloud shape remains a qualitative illustration.
- **Mayon timing and quantity:** selecting During produced a 31.4-minute snapshot. Malilipot showed 0.12 mm and 0.12 kg/m² at that snapshot, increasing to 0.37 mm and 0.37 kg/m² at the final 1,674.6-minute snapshot. Its displayed population was 41,066, year 2024. Roof and crop criteria remained unknown. These are outputs of teaching inputs, not observed eruption deposits.
- **Lava/reference context:** channel extent worked. The optional dashed 6 km reference was dated PHIVOLCS 2023-11-24 and explicitly distinguished from computed lava runout/current advisories. The orange line was labeled enlarged, while the area used the prescribed channel width.
- **Narrow themes:** both light and dark were exercised at 320 × 800. Document and body widths were 310 px, with no page overflow. The location popup occupied x=16..294 and y=426..706, scrolled a long list, committed with End/Enter and retained trigger focus. A selected out-of-domain municipality showed Unknown ash values and coverage, not zero exposure.
- **Keyboard:** custom scenario End/ArrowUp/Enter chose Mayon; closed typeahead selected Malilipot; location End/Enter selected an outside-domain receptor. Stage controls and the timeline End seek were usable. The initial automation focus-scroll closed one popup once; repeating after focus settled worked. That transient was not classified as a product defect.
- **Motion:** playback began only on Play. Switching scientific views and returning paused it. Context loss, operating-system reduced-motion changes and hidden-document transitions were inspected in source/existing component tests, not forcibly injected into the running browser in this pass.
- **Unavailable research:** Taal 2020 returned `unavailable`, seven specific blocked inputs, and the published footprint-area discrepancy. Manual comparison identified Amihan/Habagat values as unavailable and produced an accessible error when its two profiles were empty. No historical validation claim was displayed.
- **Documentation:** HTTP reads of `COMPUTATION.md`, `ERUPTION_MODEL.md`, `INPUT_VALUES.md`, `ERUPTION_RESEARCH.md` and `GEOGRAPHY_REFERENCES.md` all returned 200.

During the orchestrator's coordinated backend restart, remounting the scene correctly exposed a terrain fetch fallback while preserving completed map/results. A fresh load after the restart restored Mayon's geographic terrain. This was a known server interruption, not evidence that the bundled DEM was missing.

## Performance and visual limits

Fresh host inspection identified **AMD Ryzen 7 5800U**, **AMD Radeon(TM) Graphics**, driver **30.0.13032.4000**. The stable Chrome build reported **1 render fps / 1 browser callback per second** in the recent two-second window at 1440 px, while `document.visibilityState` was `visible` and `document.hidden` was false. Chrome window occlusion/foreground scheduling could not be independently controlled by the enabled DOM APIs. The callback rate prevents assigning the result solely to graphics cost, but it also prevents declaring the 30 fps target passed in that context. The UI accurately displayed its below-target message. Earlier in-app 45 fps evidence was not reused as this pass's result.

The final production asset `/assets/index-REFM-_ge.js` was independently loaded in Chrome. Mayon's HUD displayed **Terrain scale 1:1** and **Lava width enlarged**; the lava snapshot wording and restored default Taal ash wording both matched the selected map effect. Final 320 px light/dark checks again measured 310 px document/body widths. The browser was left on the paused Taal teaching preset, light theme, Before stage, with its viewport override reset.

The initial reproduction screenshot is `qa/browser/further-mayon-lava-before-fix.png`. Final Chrome screenshots hit a 5-second CDP capture deadline; no missing screenshot is presented as successful evidence. A visible in-app tab could not be created by this subagent (`IAB visibility is not supported in a subagent thread`), and the root's browser ID was unavailable to the subagent. The orchestrator's separate visible in-app captures/performance observations belong to the integration record, rather than being attributed to this independent browser session.

The evaluator independently viewed the root-captured final images `qa/browser/further-mayon-desktop.png` and `qa/browser/further-mobile-dark.png` from disk. The desktop image visibly contains the corrected terrain/lava scale labels, a paused during stage, the lava legend and the channel-intersection snapshot count. The narrow dark image stacks the views, wraps the clock/player/navigation and retains folded controls without clipping page content. The root separately measured **43 render fps / 43 callbacks per second** in its visible in-app browser; that resolves the target for that root-observed context, not the independent Chrome pacing observation.

The final image review identified faint N/E compass letters against Mayon's terrain. Their canvas texture in `Compass` did not declare `SRGBColorSpace`, unlike the deposit texture. A specific color-space/contrast-backplate improvement was reported to the orchestrator. Canvas-text contrast over all terrain backgrounds and orbital views remains an explicit gap pending its correction and visual reinspection; the sampled DOM-text gate below does not certify it.

## Anti-slop and skill usefulness

The approved blue scientific workspace and ENERGY 2 / RHYTHM 2 / MOTION 2 were used as the direction. The filter was useful in finding context-inappropriate fountain text, an overbroad scale claim and a mislabeled quantity. The ABO QA skill added the hidden-invalid-field recovery case and demanded valid counterexamples. Four passing fixtures demonstrate those decisions for these cases; they do not prove general scientific accuracy or all accessibility requirements.

Scoped gate evidence:

- **R-03 PASS, observed layouts:** 320 px light/dark document widths stayed within the viewport; long popups were bounded. The intentionally scrollable data table was not misclassified as page overflow.
- **R-25 PASS, sampled DOM text:** theme text tokens remained readable. Actual Leaflet links used `rgb(0,120,168)` on an 80%-white attribution surface; independent contrast calculations gave at least 4.63:1 over the visible water/land backgrounds. Canvas compass text was visually inspected but not numerically certified for every orbit/background.
- **R-26/R-27/R-32 PASS, tested workflows:** Run, stage seeks, custom selectors, extent/reference controls, theme switching and invalid recovery worked with explicit loading/empty/error states. Keyboard actions had a visible focus outline in the narrow screenshot. This is not a claim that every possible control/state was newly exercised.
- **R-17/R-18/R-24/R-36/R-38 PASS, inspected claims:** no invented testimonials/trust numbers appeared. Sources and academic assumptions were disclosed; historical agreement remained unavailable. The low-fps message was retained rather than replaced with a success claim.
- **Purpose and liveliness PASS, scoped review:** blue controls distinguish actions from the warm quantitative scale; volcano/map content is the focal point; source/grain/table disclosures reduce initial density; one timeline player serves replay and camera reset serves a different purpose. No decorative template animation was introduced.
- **C-2/C-4/C-5 PASS, corrected cases:** the hidden-field recovery and mechanism/count/scale findings were corrected by their implementation owner and independently retested as listed above. Outstanding measurement and scientific gaps below remain explicit.

## Remaining evidence boundaries

This QA does not establish empirical values for eruption mass, winds, rheology, damage/potability criteria, current advisory status or historical agreement. It does not validate current crater geometry, CFD plume shape, lava cooling/branching/ponding, municipality-wide exposure, WebGL performance on other hardware, a live MapTiler credential, full screen-reader behavior, or resource leak counts across prolonged replay. The scientific QA role owns numerical/source validation. This UI audit retains those boundaries instead of calling every visual and research value validated.
