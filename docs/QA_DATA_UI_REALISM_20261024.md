# ABO data, UI and simulation realism evaluation

Evaluated 24 October 2026 (Asia/Manila), local checkout `175d8982d5d1b93d2b55f7e11cf1e81509dd48ab`.

**Verdict: the application is a functioning illustrative ashfall simulator, but it does not currently pass as a faithful historical Taal reconstruction or a consistently explained scientific interface.** Its tested numerical accounting is substantially stronger than its provenance claims and some UI interpretations. High-priority presentation and geographic-data defects should be resolved before an academic demonstration that presents results as realistic historical outcomes.

This evaluation changed no application code or scientific data. New audit probes, screenshots and this report were added. The worktree was clean at entry. Historical QA documents were treated as leads, not fresh proof.

## Evidence and verification

| Check | Fresh result | Interpretation |
| --- | --- | --- |
| Python tests: `uv run --project backend pytest backend/tests qa -q` | 221 cases passed | Implementation and synthetic numerical checks; not empirical accuracy |
| Python lint, explicit `backend/pyproject.toml` configuration | Passed | Same configuration used by CI |
| Python formatting, same configuration | 66 files already formatted | Passed |
| Frontend `npm run check` | Passed: formatting, ESLint, TypeScript, 120 tests across 23 files, production build | No build/type/unit-test regression found |
| Actual Python OpenAPI versus committed `frontend/openapi.json` | Equal | Runtime schema matches committed JSON; TypeScript consumer compilation passed |
| All 10 catalog presets computed independently | Finite, nonnegative grids; mass balances consistent | Broad preset coverage |
| Default 37-frame sequence | Monotone receptor accumulation; zero initial grid; final grid exactly equals eventual grid | Time-dependent backend is internally consistent |
| Default 16 versus 32 release layers | No 0.5 mm reporting crossings; largest absolute municipal change about 0.00959 mm | Stable for this case, not a universal convergence result |
| Chrome browser, production build on loopback | Preset switching, raw-data dialog/Escape, During stage, comparison, sweep, historical view, Sources and theme switch exercised | Functional browser evidence |
| Viewports | 1280 desktop, 1440 desktop, 390 mobile, 320 narrow mobile inspected/measured | No document-level horizontal overflow in measured 1280/390/320 states |
| Browser console | No errors during exercised flows; Three.js Clock deprecation warnings | Warning cleanup remains low priority |

An initial broad Ruff command without the backend's explicit configuration reported failures under different inherited settings. The correctly configured CI-equivalent checks above passed; those first diagnostics are not reported as project lint defects.

Audit reproduction: `uv run --project backend python output/playwright/qa_20261024_data.py`. Structured evidence: [qa-20261024-data.json](../output/playwright/qa-20261024-data.json).

Catalog SHA-256: `7bfb50cda45aa938baee40fb40bd9bd51ce85107922e8301115830b2896f233e`. Current catalog revision is `2026-10-12-gap-evidence-v2-utf8`; a revision label alone does not identify all subsequent changes.

## Prioritized findings

### 1. High: the Sources page overstates evidence and contains an incorrect paper citation

`frontend/src/Workspace.tsx:2544–2635` renders a separate, hard-coded provenance presentation. It says “All values local; zero synthetic placeholders,” although all ten presets carry `input_status: illustrative`. It attributes regional physical inputs to a paper while the parameter register and historical API still withhold independent ash mass, density, grain fractions and settling speeds.

The displayed Balangue-Tarriela citation has incorrect initials, title, article number and DOI. The publisher's actual record is **M. I. R. Balangue-Tarriela et al., Analysis of the 2020 Taal Volcano tephra fall deposits from crowdsourced information and field data, Bulletin of Volcanology 84, article 35 (2022), DOI 10.1007/s00445-022-01534-y**. [Publisher record](https://link.springer.com/article/10.1007/s00445-022-01534-y).

The UI instead displays DOI `10.1007/s00445-022-01552-3` and a different title. That DOI could not be resolved in this audit; its bibliographic mismatch is independently established by the correct publisher record. The PHIVOLCS card also describes field ground-truth contours at multiple levels, while the historical API supplies no point observations or evaluation metrics and explicitly reports source blocks. The GVP card combines volcano-profile, terrain and seismic-catalog claims without a matching parameter-level evidence trail.

**Recommendation:** generate the visible registry from the same reviewed source records used by the backend. Show measured, derived and assumed status beside each physical input. Correct the citation and qualify claims of ground truth and review. Merely linking an agency homepage does not substantiate a particular numeric dataset.

### 2. High: “Before eruption / 0 h” displays eventual deposits and exposure

On initial load, the timeline reads 0 h and Before, but the map, exposure HUD and dashboard show 100 municipalities, peak 30.991 mm, 22,691,111 indicative residents and 5,534,417 estimated families. The backend's actual first frame is zero everywhere.

Root cause: `Workspace.tsx:1569,1588` passes a null frame when paused at index zero, and `VolcanoScene.tsx:1581` explicitly substitutes the eventual result for a paused Before frame. The HUD adds an EVENTUAL badge, but retains the “Real-Time Exposure Tally” heading alongside a clear pre-eruption scene. The default screenshot records this contradiction. At During / approximately 5.1 h, the HUD and dashboard correctly switch to 62 municipalities and peak 9.274 mm.

**Recommendation:** always use the selected snapshot in timeline mode, including index zero. Provide a separate explicit eventual-results mode. Keep the full eventual table clearly labeled, as it already is.

### 3. High: geographic curation misassigns same-name places to provinces

`frontend/public/municipal-boundaries.geojson` contains two records named “City of Calamba, Laguna.” One center is 14.18722°N, 121.12041°E; the other is **8.52096°N, 123.64016°E**, far outside Laguna. This is a concrete data error, not a rendering artifact.

Root cause: `scripts/curate_expanded_visualization.py` resolves names such as Calamba without sufficient spatial or official-code constraints, then keeps resolved features even outside the Taal domain. Misassigned geometry is also included in provincial dissolves. Similar broad name heuristics require review, although this audit does not claim every such rule produces an error.

**Recommendation:** use validated administrative identifiers and parent-province membership. Require bounded geography and a unique match; retain ambiguity as unresolved. Regenerate municipal and provincial assets only after a reviewed crosswalk passes.

### 4. High: displayed wind and operative wind differ in the default scenario

The scene and scenario cards prominently display 205° FROM and 18 m/s. The default solver instead uses a five-level profile. Changing only the scalar wind to 0° FROM and 1 m/s produces **exactly zero grid difference**. Its representative middle-column transport vector is approximately (-4.014, 2.507) m/s, rather than the displayed scalar wind vector.

`service.sources()` intentionally ignores scalar winds when a profile exists, and provenance discloses this deep in the result. `VolcanoScene.tsx` still displays the scalar values as the wind. Users can reasonably infer that these are the values driving deposition.

**Recommendation:** show “height-dependent profile” as the active wind, expose its levels, and disable or clearly label inactive scalar controls. Distinguish reference bearings used to rotate a sweep from actual operative winds.

### 5. High: the default umbrella extension is an empirical shape prescription with incomplete disclosure

`kernel.py` hard-codes a 40% proximal / 60% distal split, Suzuki-style release weights, a 0.65–1.0 height remapping and additional spread coefficients. `service.py:96–98` forces the proximal 40% to have **zero horizontal advection**, even under nonzero winds. This does not inherently break mass conservation; it substantially changes the physical interpretation of the default regional footprint.

The implementation prescribes broad Gaussian distributions rather than solving umbrella-current expansion. Calling the input an expansion “up to” a radius is also imprecise: Gaussian tails are not a hard physical edge. No independent calibration or physical uncertainty evidence for these coefficients was established. Existing umbrella tests verify chosen output shapes and thresholds, not observed predictive skill.

**Recommendation:** label this a heuristic two-component deposition model, document and expose its coefficients, and compare against held-out observations or an independent transport model. Do not treat a cohesive contour or the absence of offshore deposition as a universal physical validity rule.

### 6. Medium: a reproducible wind-integration defect affects accepted elevated profiles

`kernel.layer_winds(..., column_integrated=True)` accumulates from the first supplied profile height but divides by height above the vent. It omits the constant-wind segment below that first height.

Reproduction: a uniform 10 m/s easterly transport profile supplied at 500 and 2000 m should average to 10 m/s at 1000 m under the documented constant-end extrapolation. It returns **5 m/s**. This does not affect the shipped regional profile's zero-height first level, but it affects accepted custom profiles.

**Recommendation:** integrate the lower segment explicitly, or require the profile to start at zero and reject incompatible profiles. Add the uniform-wind invariant as a regression check when implementing the fix.

### 7. Medium: map values and exposure inventories have different coverage and sampling

There are 460 municipal boundary features but only 318 municipal receptors. Reproducing the UI's ID/name lookup leaves **138 boundary features without a matching result row**. The regional default covers 162 municipal receptors. The map fills unmatched areas and labels some cities by sampling the grid in the browser, while population counts and tables use backend receptors only.

`GeographicMap.tsx` uses a degree-to-metre approximation and nearest-cell lookup for this fallback, whereas the backend uses a vent-centered WGS84 projection and analytical point evaluation. Consequently, a mapped municipality can appear to have a numeric deposit but contribute nothing to the receptor exposure table or population summary. These are different quantities, not necessarily an arithmetic error.

**Recommendation:** distinguish grid-estimated boundary values from reviewed receptor samples visibly. Publish covered/missing municipality counts, use consistent backend coordinates, and avoid implying that a filled regional map establishes complete population coverage.

### 8. Medium: family and severity labels imply more than the data support

`presentation.ts:54–61` divides population by 4.1, a Region IV-A household-size assumption, across every region and volcano. The browser's Mayon example reports 101,070 families from 414,386 residents using that same assumption. The default Taal example mixes 2024 populations with a 2020 regional household-size conversion. Households and families are not interchangeable, and the count includes whole municipal populations whenever a centroid crosses a cutoff.

`ProvincialExposureExplorer.tsx` labels thickness bands “Severity Tier,” Heavy, Moderate and Light without reviewed damage thresholds. Elsewhere the dashboard correctly says its bands do not describe hazard severity. The family totals also use different rounding order between aggregate KPI and municipal/provincial summaries.

**Recommendation:** use an explicitly assumed household-equivalent estimate or reviewed region/year-specific data; retain missing populations as unknown. Rename severity to deposit-thickness band and provide context rather than an implied damage category.

### 9. Medium: the default “actual event” name conflicts with illustrative inputs and historical coverage

The default preset names the 12–13 January 2020 “actual event,” but uses an illustrative 10-hour steady source, 17 km above-ground column, assumed 54 billion kg ash mass and 2024 population accounting. The frozen reference protocol defines a separate mapped interval of 55,680 seconds (about 15.47 hours), distinguishes ASL from above-vent height, and requests 2020 population.

The broad eruption scale is plausible, but those choices do not establish event reconstruction. The publisher describes a changing eruption and reports plume heights in ASL; the chosen effective duration and height datum need explicit interpretation. All ten presets are still illustrative.

**Recommendation:** call it a “Taal-inspired regional illustrative scenario,” state the modeled interval, and label the population year prominently. Reserve historical reconstruction language for a configuration that satisfies the frozen evidence protocol.

### 10. Medium: model explanations contradict the selected solver branch

The Sources page says Suzuki weighting, then says equally weighted release heights in the same section. Backend provenance always says “Uniform release-height weights,” including for the regional umbrella branch that actually uses nonuniform Suzuki-style weights. The Sources page also presents density 1000 and diffusivity 1000 as general model constants even though they are editable scenario inputs and other presets use different values.

**Recommendation:** derive a concise mathematical explanation from the active scenario and branch. Keep the default Gaussian, profile transport and umbrella heuristic documented separately. Update dataset/solver revisions when behavior and inputs change.

## Is the simulation realistic?

**For qualitative teaching: conditionally useful.** Wind-dependent transport, different settling times, grain mixtures, eventual load/thickness conversion and finite-emission accumulation have sensible interpretations. Terrain and the enlarged visual plume provide orientation when explicitly described as illustration. All presets produced finite nonnegative deposits and conserved their modeled mass accounting.

**For quantitative historical prediction: not established.** The app itself reports insufficient wind coverage, incomplete independent physical inputs, no usable held-out point observations and unquantified observation uncertainty. A realistic-looking terrain or expected northward footprint cannot fill those gaps. More complete transport models use evolving meteorology; the shipped profile is altitude-dependent but temporally stationary. [USGS Ash3d model description](https://www.usgs.gov/publications/ash3d-a-finite-volume-conservative-numerical-model-ash-transport-and-tephra-deposition).

The default sequence's 103.41-hour end time is a settling-tail horizon, not 103 hours of continuous eruption. A 10-hour emission plus approximately 93 hours for the slowest modeled component explains it mathematically. Whether that tail matches real ash requires independent settling and atmospheric evidence. The 300 km domain retains 78.017% of total ash; roughly 21.983% lies outside it. That explicit finite-domain loss is appropriate and should remain visible.

The 16-to-32-layer result is reassuring for the default: San Nicolas changes from 30.99112 to 31.00071 mm (about 0.031%), with 100 centroids above the reporting cutoff in both cases. This is a sensitivity observation, not proof that all grids, parameters or physical assumptions are accurate.

## UI observations and evidence limits

Desktop provides useful side-by-side scene, map and analytics. Mobile stacks the views and retained 390/320 px document width without horizontal page overflow. Long preset names truncate, and several desktop KPI subtitles are clipped; explicit active assumptions deserve more visible space. The 390 px screenshot also shows the limited screen area available for the model and data at once. These are secondary usability concerns compared with the interpretation issues above.

The raw-data dialog correctly labels eventual totals and retains population year per row. A manual Mayon comparison at 10 m/s FROM 45° versus 225° returned 8 versus 6 reported municipal centroids and 652,255 versus 414,386 indicative residents. The wind sweep completed and explicitly called its output an envelope, not one simultaneous event. The historical view displayed its blocked-input reasons rather than manufacturing an agreement score.

This audit did not certify screen-reader behavior, WCAG contrast, every keyboard path, CSV round-trip behavior, prolonged GPU/VRAM stability, foreground frame rate, production hosting or physical hazard prediction. No fresh full accessibility scan or long soak was performed. No claim is made that every census transcription or every geographic crosswalk was independently re-sourced; the confirmed geographic defect demonstrates why that broader review remains necessary.

## Recommended order of work

1. Correct the hard-coded source claims, citation and “actual event” name; restore visible measured/derived/assumed distinctions.
2. Make Before/During/After use one consistent snapshot and show the operative wind profile.
3. Repair ambiguous geographic crosswalks, then reconcile boundary coverage with receptor and population coverage.
4. Document and evaluate the umbrella heuristic; fix elevated-profile integration and branch-specific provenance.
5. Replace implied impact/severity/family claims with quantities the model actually estimates.
6. Repeat the numerical and browser checks, then run a dedicated accessibility audit. Historical approval still requires independent inputs and held-out evaluation.

## Retained artifacts

- [Numerical/data evidence](../output/playwright/qa-20261024-data.json)
- [Reproducible audit probe](../output/playwright/qa_20261024_data.py)
- [Desktop initial-state screenshot](../output/playwright/qa-20261024-desktop.png)
- [390 px During-state screenshot](../output/playwright/qa-20261024-mobile.png)
- [320 px screenshot](../output/playwright/qa-20261024-320.png)
- [Sources page, dark theme](../output/playwright/qa-20261024-sources-dark.png)

The passing implementation checks support continued development. They do not override the high-priority evidence, geographic and time-state findings in this report.
