# Independent manuscript QA

Reviewed 17 October 2026 by the delegated independent evaluator. Manuscript and implementation were read-only.

## Artifact and scope

- DOCX SHA-256: `8821101b9c3574e9a8fb283438e3699b7d4cf4c4b6b85cba903b2b1186b01470`.
- Directly inspected all seven PNG pages in `qa/current_review/times_reference_final_20261017`, plus actual DOCX paragraph/run/section properties and source manuscript.
- Read project instructions, QA skill, documents/PDF skills, project context, map and scientific gap records.

## Findings

**P2 research reproducibility limitation:** Methods B-D and Results B-C identify an archived regional earthquake selection but omit the spatial/magnitude/query inclusion rules and exact archived subset locator. The agency landing-page reference alone does not identify the 49 retained events. Add a data availability paragraph identifying the archived CSV and hash, and disclose that the original query is unavailable rather than reconstructing an unsupported selection rule. NOAA processing provenance can similarly identify the retained `tanay-effective-wind.json` QC record. This is a research-method improvement, not a typography failure.

**P3 sample fidelity:** The sample uses bracket-number references; the manuscript retains consistent author-date citations and bibliography entries. Thus its visual layout follows the sample, but citation style is not an exact copy. No citation conversion is needed unless exact reference styling is requested.

**Accessibility remains unverified:** The author layout is an editable borderless table; a generic table-header warning on that table does not mean scientific data headers are missing. Native Word accessibility and screen-reader operation were not tested.

## Passed checks

- Actual Normal style is Times New Roman 10 pt, justified. Heading 1 and Heading 2 are Times New Roman 11 pt bold. The Abstract label has direct 11 pt bold formatting; its prose is 10 pt bold italic. Title is centered 24 pt.
- Actual section XML defines a single-column title/author area, continuous two-column research body and closing balancing section.
- All seven supplied names, affiliations and emails are present. Email addresses are editable and readable, with a deliberate manual line break before `@gmail.com`; a copied address may require removing that break.
- Independently viewed pages 1-7 show no clipping, overlap, missing figure, detached caption, broken table or footer collision. Sparse final bibliography page is balanced and contains content, not a blank extra page.
- University banner remains on page 1; running title and page footer remain on all seven pages.
- IMRAD sequence is Introduction, Methods, Results and Discussion, with conclusion within Discussion and a separate bibliography.
- Scope is volcanic processes and archived evidence. No application implementation or simulated result is presented as the study result.
- Scientific qualifications remain explicit: same-source contour agreement is not independent measurement; later regional earthquakes are not 2020 precursors; insufficient upper-air coverage is not extrapolated; current populations do not replace missing historical populations; unsupported contextual observations are excluded.

## Conclusion and limits

Requested typography and IMRAD formatting pass this independent page and XML review. No material layout defect was found. Methods provenance should be strengthened before academic submission. This pass did not independently reconstruct every numerical result, fetch sources anew, test the app, run native accessibility tools or establish predictive volcanic validity.
