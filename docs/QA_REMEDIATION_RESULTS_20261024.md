# Data/UI realism remediation results

Branch: `codex/data-ui-realism-remediation` from `175d898`.
Implemented and verified locally on 24 October 2026 (Asia/Manila).
Plan: [QA_REMEDIATION_PLAN_20261024.md](QA_REMEDIATION_PLAN_20261024.md).
Original evaluation: [QA_DATA_UI_REALISM_20261024.md](QA_DATA_UI_REALISM_20261024.md).

## Findings and resulting behavior

| Finding | Change | Evidence |
| --- | --- | --- |
| 1. Incorrect bibliography and unsupported source claims | Removed the separate hard-coded citation cards and zero-placeholder claim. Sources uses the catalog's actual registry, including the correct Taal paper. Selected input values, their illustrative status and backend assumptions are visible. | Source page and `ScenarioEvidence` regression checks; catalog source record remains the authority. |
| 2. Before/0 h displays eventual totals | Map, scene HUD and dashboard now receive/use the actual first frame. Stage changes share one selected snapshot, while the table and raw exports retain explicit eventual labels. | Independent browser observation: Before/0 h zeros, During values update together. Backend first frame max 0 mm. |
| 3. Same-name geographic misassignment | Curation requires one reviewed normalized-name/source-centroid match and writes the real receptor ID. Unmatched boundaries keep raw names and unresolved administration; only reviewed matches enter province unions. | 318 reviewed matches + 109 unresolved features; no distant Calamba assigned to Laguna. Deterministic regeneration confirmed. |
| 4. Operative wind differs from displayed scalar | Scene/cards show the active profile; Sources lists its levels and transport interpretation. Scalar controls are labeled profile rotation/speed references, and zero-speed recovery is corrected. | Browser profile-control checks; active-wind component tests. |
| 5. Undisclosed umbrella shape prescription | Preserved the teaching model rather than inventing calibration. Shared named coefficients and completed-run provenance disclose the stationary 40%, advected 60%, Suzuki k, release-height remapping and spread parameters. Gaussian parameter is not presented as a maximum cloud edge. | Fresh default provenance and `test_realism_remediation.py`; all preset peak values unchanged. |
| 6. Wind integration omits interval below first level | Included constant endpoint winds between the vent and first supplied altitude. Active-umbrella detection also agrees with the actual all-pulse-height condition. | Uniform 10 m/s profile starting at 500 m now returns 10 m/s at 1000 m, rather than 5. Piecewise varying-profile integral checked independently. |
| 7. Map values differ from receptor coverage | Removed browser degree-to-metre grid fallback and name-only joins. Unmatched boundaries get no numeric deposit/population value. Map disclosures and tooltip distinguish centroid sampling and missing coverage. Province unions are labeled partial inventory. | ID-only crosswalk tests, generated data inspection and browser review. |
| 8. Unsupported families and damage tiers | Removed household/family inference from the product. KPI/HUD/province tables display indicative population, census year and unknown records. Deposit bands use numeric thickness ranges rather than severity words. | Frontend regression checks preserve missing values and trace-only reporting; browser census workflow. |
| 9. “Actual event” preset title | Renamed opening preset to Taal-inspired regional illustrative scenario and updated its curator. Documented the assumed 10-hour source separately from the frozen historical interval. | Catalog/provenance checks; default browser preset. |
| 10. Contradictory model descriptions | Descriptions follow active profile and release-weight branch. Density/diffusivity are shown as scenario inputs. Dataset revision and solver versions identify the changed metadata and numerical edge case. | Backend provenance and frontend branch tests; OpenAPI regenerated and verified. |

Clarification of original finding 4: the audit's scalar-only API probe correctly showed that a supplied profile overrides scalar metadata. Subsequent source inspection established that the existing UI scalar handlers already rotated/scaled all profile levels. They were not inert UI controls. The remediation clarifies those semantics and fixes recovery from a zero speed reference; it does not claim to have introduced profile rotation/scaling for the first time.

## Verification

- Python: **230 cases passed**, including 9 additional numerical/data regressions; independent QA also ran the full Python suite.
- Backend Ruff lint and formatting passed with `backend/pyproject.toml` explicitly selected.
- Frontend: **123 tests in 24 files passed**, plus formatting, ESLint, TypeScript and production build. Repeated after the final census-label wrapping correction.
- Regenerated OpenAPI JSON/types; actual runtime OpenAPI equals committed generated JSON.
- All ten presets: finite nonnegative grids and mass accounting preserved. Largest change in preset peak centroid thickness versus the original audit is **0 mm**.
- Default 37-frame sequence: initial zero deposits, monotone receptor accumulation, zero emitted/deposited/airborne mass discrepancy and final grid exactly equal to the eventual grid.
- Default 16/32-layer sensitivity remains stable with no 0.5 mm reporting-cutoff crossings.
- Curation is deterministic for catalog, municipal overlays and provincial overlays.
- Whitespace review passes with `git -c core.whitespace=cr-at-eol diff --check`, preserving the repository's archived CRLF `data/** -text` policy.

Fresh structured numerical results: [remediation-20261024-data.json](../output/playwright/remediation-20261024-data.json).
Reproducible probe: [remediation_20261024_data.py](../output/playwright/remediation_20261024_data.py).

The post-implementation antislop review followed the existing DESIGN.md direction. It identified truncated population-year subtitles; those subtitles now wrap so census year and unknown-record counts can be read. This was a data-comprehension fix, not a visual redesign.

## Independent QA

A separate QA agent was explicitly spawned after implementation. Its application review was read-only, with its own evidence and report: [QA_INDEPENDENT_REMEDIATION_20261024.md](QA_INDEPENDENT_REMEDIATION_20261024.md). It independently passed 230 backend cases and 123 frontend cases, checked separate quadrature, all ten presets, census unknowns, profile controls and desktop/mobile flows, and found no blocking correctness defect.

Its accessibility follow-up prompted explicit group/region roles on the phase choices,
legend, map and provincial explorer. The rebuilt app passed all frontend checks again.
Final independent axe scans had zero confirmed violations at desktop 1440 px and
mobile 320 px; Sources at 390 px had zero violations and zero incomplete checks.
Graphics contrast and link-style checks still need manual review, so this is not an
accessibility certification. The independent report retains the raw scans and their scope.

The normal local app on port 8000 was restarted with the updated backend after the
separate QA run; it now exposes dataset revision v3 and solver version 1.1. Port
8069 remains the independently evaluated equivalent build.

## Remaining scientific limits

No implementation change supplies missing empirical evidence. Independent ash mass/density,
defensible event winds, complete historic census/boundary review and held-out observations
remain unavailable. The umbrella model remains an uncalibrated teaching prescription.
The explicit missing data are preserved rather than invented or relabeled as verified.
These fixes improve correctness and interpretation; they do not certify historical prediction,
hazard severity, roof safety, water potability, aviation safety or evacuation counts.

The branch remains local; no push, merge or deployment was performed. Original audit
evidence is preserved. See the independent report for browser/a11y coverage and its limits.
