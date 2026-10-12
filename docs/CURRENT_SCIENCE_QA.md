# Independent scientific and manuscript review

Reviewed 12 October 2026 by the `research_accuracy_qa` agent. Implementation corrections belong to the orchestrator. This report evaluates the reduced model and evidence; it does not certify eruption forecasts.

## Findings and correction retest

**P1 — Custom receptors bypassed the selected census year.** Before correction, `service.prepare` transformed only catalog receptors. A request selecting 2020 could count a custom receptor's 2024 population as if it belonged to the selected reporting year. The independent reproduction used a synthetic vent receptor with population 123 and `population_year=2024`, requested 2020, and obtained an indicative count of 123. This contradicted the documented missing-year rule.

The orchestrator corrected the shared preparation path. An explicitly present year-specific record is authoritative, including null. Otherwise a standalone population is accepted only when its year matches the request; missing years retain null. Twenty-two fresh independent cases now pass, including custom records through simulation, sweep, sequence and all three API routes, explicit-null and absent years, and airport/water counterexamples. Facility population metadata remains valid but never contributes to municipal population totals.

**Unicode curation correction — independently verified.** The application QA agent identified corrupted characters in scientific labels. The orchestrator corrected UTF-8 reads and assigned dataset revision `2026-10-12-gap-evidence-v2-utf8`. Independent recursive comparison against the original catalog found exactly 13 text changes: 12 character repairs and one revision. There were no numeric, structural, receptor, criterion or teaching-parameter changes. The frozen protocol retains its original identity. Evidence: [`science-catalog-diff.json`](../qa/current_review/science-catalog-diff.json).

A preliminary concern about `RESEARCH_DOCUMENT_QA.md` was withdrawn after reading its full date hierarchy: its current Word-rendered revision explicitly supersedes the earlier unavailable-Word record. The earlier record is dated history, not a failed current gate. Likewise, an initial exact-list grid comparison differed by approximately 2e-19 due to floating-point reduction order; a justified tolerance passes, so this was a QA false positive rather than a model defect.

## Numerical and API evidence

The fresh independent suite uses isolated synthetic inputs and scalar `math.erf`/trigonometric expectations rather than values copied from the numerical implementation. It verifies cardinal wind-from conversion; every exact Gaussian cell in a small calm grid; finite-domain mass accounting; component-arrival and still-airborne mass across all 37 sequence snapshots; accumulated-grid monotonicity; final grid agreement; custom census consistency; valid facility counterexamples; strict nonfinite-input rejection; unavailable historical predictions; and the saved manuscript example.

The saved Mayon teaching request reproduces 100,475 seconds (27.9097 hours) through final settling, 36,000,000 kg emitted, 30,459,336.28543452 kg inside the domain, 5,540,663.714565478 kg outside and zero still aloft. These are results of assumed parameters, not measurements.

Reproduce the independent cases with:

```powershell
uv run --project backend pytest qa/current_review/test_current_science.py
uv run --project backend python qa/current_review/science-catalog-diff.py
```

The cases are also included by normal `pytest backend/tests qa` discovery. Test passes establish the implemented mathematical behavior under tested conditions; they do not establish empirical predictive accuracy.

## Research and primary-source review

The IMRaD manuscript defines its inputs, units, equations, finite-emission timing, projection, cell-versus-point quantities, screening, split rules and evidence limitations. The current reduced ash equations are dimensionally consistent with the implementation. Bulk deposit density remains distinct from particle density. The lava equation uses along-slope mean velocity and normal depth; the terrain route is a separate teaching approximation.

Primary sources were revisited directly:

- [Balangue-Tarriela et al. (2022)](https://link.springer.com/article/10.1007/s00445-022-01534-y) supports the 17–21 km **ASL** height, local UTC+8 chronology and uncertainty from delayed measurements and subjective contouring. The cached article XML independently confirms the differing 8,605 km² narrative and 3,864.89 km² outer-contour table values; these remain unresolved rather than selected to improve agreement.
- [Borch et al. (2025)](https://www.nature.com/articles/s43247-025-02991-x) Equation 3 supports the Jeffreys mean-speed expression. Its constriction/back-up experiments do not validate ABO's fixed-channel Mayon route or assumed rheology.
- [Official Tephra2 repository](https://github.com/geoscience-community-codes/tephra2), [NOAA IGRA](https://www.ncei.noaa.gov/products/weather-balloon/integrated-global-radiosonde-archive), [USGS building guidance](https://volcanoes.usgs.gov/volcanic_ash/buildings.html) and [USGS lava guidance](https://www.usgs.gov/observatories/hvo/frequently-asked-questions-and-answers-about-lava-flow-hazards) support the documented model/reference boundaries. Agency advice is not a condition-specific local numerical damage criterion.

The PMC web page returned a browser challenge during this review; the live Springer article and locally archived, hash-verified official PMC files supplied the source text. All four archived article-source hashes match their manifest. No public-source fact was promoted to a measured model parameter without its evidence classification.

## Empirical accuracy and completeness limits

The frozen Taal protocol remains scientifically defensible as a prospective procedure, but its source gate is blocked. Both selected Tanay soundings cover 15/21 requested altitude-grid positions, below the predeclared 75% requirement. There is no accepted independent ash mass, bulk density, emitted grain/settling spectrum or surveyed active 2020 vent datum. The two digitized contours are one dependent source and do not create independent point observations. No defensible predictive acceptance tolerance is established. The historical API correctly returns no simulation or invented empirical metrics.

Municipal coverage is partial; historical populations are available only for the recorded subset. Roof/crop condition-specific criteria and water-facility inventories remain unavailable. The 0.5 mm cutoff is a reporting footprint. Centroid-selected whole populations are indicative; surface airport/water deposition does not establish flight safety or potability.

The 16-layer approximation has the previously reported 18.28% point change when increased to 32 layers. Uniform wind, flat ash ground, constant settling, omitted aggregation/rain/terrain interception, fixed-width Newtonian lava and illustrative plume/fountain/cooling appearance remain retained limitations. More convincing imagery does not resolve these physical omissions.

## Actual Word artifact review

**Final replacement review passed within its stated scope.** The independent reviewer inspected each of the 16 replacement Word-rendered PNGs individually, not only selected pages or a contact sheet. Headings, seven editable equations, three tables, three figures/captions and all references were readable without clipping or overlap. Figure 2 remains with its caption; keeping that block together leaves ordinary whitespace on page 11. No blocking pagination defect was identified.

The read-only content/typography audit found all 162 prose/table-cell paragraphs in the actual Word PDF, with no missing content or Arial 11/12 size defects. The replacement manuscript accurately reports the new census correction and 164 Python/61 frontend results, distinguishes the map's computed snapshots from interpolated illustration and eventual table/CSV quantities, reports the 27.9-hour horizon versus 1-hour emission, and restricts the older performance campaign to its tested renderer. Physical/evaluation blockers remain explicit.

- Reviewed DOCX SHA-256: `666ce8604ed6acfad35730b9c8330e613b421bd9ba170da2f99c54180ae2da3a`.
- Actual Word PDF SHA-256: `b2931607b35b7c88d9eaa15b9a616724b9474d27481b33d9fa8bd3b8bc64226f`.
- Manuscript Markdown SHA-256: `3267db0c3eecc69bc2e5d42086a0891c1cef4508b61c443121be01c2a095f8fc`.

Evidence: [`science-document.json`](../qa/current_review/science-document.json) and [`science-page-review.json`](../qa/current_review/science-page-review.json). The reproducible read-only checker is [`science-document-audit.py`](../qa/current_review/science-document-audit.py), run with the desktop's bundled artifact Python. Any artifact replacement invalidates this hash-bound review. Word's native accessibility checker and actual screen-reader speech remain separate unperformed gates.
