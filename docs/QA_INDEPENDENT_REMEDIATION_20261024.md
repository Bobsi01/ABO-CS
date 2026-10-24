# Independent QA of data/UI realism remediation

Evaluated 24 October 2026 (Asia/Manila), branch `codex/data-ui-realism-remediation`.

**Verdict: the ten reported implementation and presentation findings are addressed within the stated illustrative-simulation scope. No remaining blocking correctness defect was identified in the exercised cases. Historical predictive accuracy remains unestablished.** The umbrella model remains a disclosed, uncalibrated teaching heuristic; this review does not convert it into a validated physical eruption model.

This report was written by the separate QA agent requested by the user. The QA agent did not implement or edit application code, catalog values or the remediation fixes. It independently inspected the diff, ran the backend/frontend tests and independent numerical probes, and exercised a fresh Chrome session against the updated local production build at `http://127.0.0.1:8069`. Port 8000 was deliberately excluded because its older backend process was stale.

## Finding closure

| Original finding | Independent result | Evidence and practical limit |
| --- | --- | --- |
| 1. Misleading sources and citation | Addressed | Sources no longer contains the incorrect `01552-3` DOI, fabricated title or “zero synthetic placeholders” claim. The expanded catalog registry supplies the existing correct Taal title and `01534-y` URL. The page states that citations do not validate presets. This checks consistency with the reviewed local registry, not a new re-transcription of every external source. |
| 2. Before/0 h shows eventual totals | Fixed | Fresh browser initial state shows zero in HUD, map snapshot and dashboard. During at about 5.1 h consistently shows 62 reported centroids and peak 9.274 mm in HUD, with 9.27 mm rounded dashboard value. Backend first grid is zero; accumulation is monotone and final grid matches eventual output. Eventual tables remain explicitly labeled. |
| 3. Remote Calamba assigned to Laguna | Fixed | Regenerated assets have 427 municipal features: 318 exact reviewed receptor-ID matches and 109 explicit unmatched features. The distant polygon is no longer named City of Calamba, Laguna or dissolved into a purported complete Laguna boundary. Matching now requires both source-centroid agreement and a unique compatible name. Unmatched features retain unresolved province/region. |
| 4. Operative profile versus scalar wind | Addressed, with audit clarification | Scene and dashboard identify the active height-dependent profile. Drawer scalar fields are labeled profile rotation/speed references; Sources exposes all actual levels and the transport interpretation. The original audit's API scalar-only probe did **not** test the pre-existing UI handlers that rotate/scale the whole profile. Those handlers already changed profile inputs; the fix clarifies semantics and adds recovery when a speed reference is changed to zero and back. Independent browser test 0 → 18 recovered all five level speeds to 18 m/s. |
| 5. Hidden umbrella assumptions | Addressed by explicit disclosure | Expanded completed-run assumptions state the stationary 0.4 proximal fraction, distal fraction, Suzuki coefficient, remapped heights, spread coefficients, Gaussian tails and uncalibrated status. The physical heuristic itself is retained, not empirically validated. All ten presets conserve their modeled mass and return finite nonnegative deposits. |
| 6. Elevated-profile integration | Fixed | Separate SciPy quadrature of a turning, variable-speed profile matches the kernel at six heights below, within and above the supplied elevated levels. The constant lower endpoint segment is now included. The formerly failing uniform 10 m/s case is covered by regression tests. |
| 7. Map/inventory sampling mismatch | Addressed | Frontend uses reviewed receptor IDs, removes approximate browser grid sampling/name fallback, and discloses missing receptor coverage. Unmatched boundaries have no numeric point value or population tally. Province unions are explicitly partial. This improves honesty of incomplete coverage rather than inventing missing data. |
| 8. Families/severity overclaim | Addressed | Family estimates and damage-like severity labels are removed from the visible affected-population workflow. Deposit bands use numerical thickness ranges. Browser 2020 custom run reports 67 unknown population records, preserves year 2020, and agrees across HUD/dashboard; missing population is not filled with 2024 counts. |
| 9. “Actual event” default label | Fixed | Default preset is Taal-inspired regional illustrative scenario. Its 10-hour assumed emission, above-ground height and unestablished historical status are visible. Historical API remains unavailable rather than manufacturing a validation result. |
| 10. Contradictory solver explanations | Addressed | Regional Sources view shows assumed Suzuki-style weighting and the stationary/advected split, with no uniform-weight claim in expanded regional run assumptions. Density/diffusivity are described as editable inputs and display actual scenario values. Backend provenance selects uniform or heuristic explanation by the active branch. |

## Fresh independent checks

- **230 Python cases passed** through `uv run --project backend pytest backend/tests qa -q`.
- **123 frontend cases passed across 24 files** through a separate `npm test -- --reporter=dot` invocation.
- Independent quadrature, all-ten-preset positivity/mass balance, initial-zero sequence, monotonic receptor accumulation and final/eventual grid checks passed. See [numerical evidence](../output/playwright/remediation-20261024-independent/numerical-evidence.json) and [probe source](../output/playwright/remediation-20261024-independent/probe.py).
- The underlying implementation agent also reported passing lint, formatting, TypeScript and production build. This QA agent independently exercised that production build and separately ran the tests above; it did not label the parent's command executions as its own.
- Fresh browser console had no errors in the exercised states. Three.js Clock deprecation warnings remain; these are not observed numerical/data failures.

## Browser and visual review

The fresh session exercised Before/During/After and timeline endpoint seeking, parameter disclosure, profile-speed zero recovery, census-year selection, simulation rerun, Sources navigation, active profile/provenance/registry expansion, theme switching and responsive layout. A custom 2020 census rerun with the recovered wind profile reached 93 centroids and reported 2,104,963 known residents plus 67 unknown population records. This differs from the default scenario because the QA interaction intentionally changed the profile speeds; it is not a regression comparison to the original default.

Desktop 1280/1440 and mobile 390/320 widths were inspected. Measured document width equaled viewport width in the checked mobile states. The refreshed final 1440 capture confirms the census/unknown-record KPI subtitle wraps instead of being hidden by ellipsis. Source cards and equations remained legible in the inspected dark 320 px capture. The report does not certify all zoom levels or every long-label combination.

Key screenshots:

- [Final refreshed desktop / zero-time state](../output/playwright/remediation-20261024-independent/final-desktop.png)
- [Final 390 px simulation](../output/playwright/remediation-20261024-independent/final-mobile.png)
- [2020 population / unknown-count state](../output/playwright/remediation-20261024-independent/2020-population.png)
- [320 px dark Sources](../output/playwright/remediation-20261024-independent/sources-320-dark.png)
- [320 px dark simulation](../output/playwright/remediation-20261024-independent/simulation-320-dark.png)

## Automated accessibility scope

A cached axe-core **4.13.0** was injected into the independently controlled browser. Scans targeted WCAG 2 A/AA and 2.1 AA tags; these are automated checks, not accessibility certification.

| State | Confirmed violations | Manual-review results |
| --- | --- | --- |
| Sources at 390 px, profile/provenance/source-registry disclosures expanded | 0 | 0 incomplete; 24 passing rules |
| Final Default Simulation at 1440 px | 0 | 34 passing rules; incomplete color-contrast and link-in-text-block checks require manual review |
| Final Default Simulation at 320 px | 0 | 34 passing rules; incomplete color-contrast and link-in-text-block checks require manual review |

The initial generic-container incomplete results were sent to the implementation agent separately. It added explicit named group/region semantics to the phase choices, legend, map stage and provincial explorer. A refreshed final build was independently rescanned: the aria-prohibited-attr manual-review category is now absent in both desktop and mobile states. Remaining contrast and link-distinction checks involve rendered graphics or styling that automation could not conclusively evaluate; zero confirmed violations is not a clean manual accessibility certification.

Raw files: [Sources scan](../output/playwright/remediation-20261024-independent/axe-sources-mobile.json), [final desktop Simulation scan](../output/playwright/remediation-20261024-independent/axe-final-simulation-desktop.json), [final mobile Simulation scan](../output/playwright/remediation-20261024-independent/axe-final-simulation-mobile.json). Earlier [desktop](../output/playwright/remediation-20261024-independent/axe-simulation-desktop.json) and [mobile](../output/playwright/remediation-20261024-independent/axe-simulation-mobile.json) scans are retained as before-fix evidence.

## Remaining evidence boundaries

The review does not establish historical predictive accuracy, complete population/geographic coverage, source-backed roof/crop/aviation damage thresholds, empirical uncertainty bounds, hardware validity, prolonged GPU/VRAM stability or foreground frame-rate performance. Those scientific inputs cannot be replaced by passing unit tests or a convincing map. The intended approval is for the remediation of the reported implementation and presentation defects while preserving these explicit limits.
