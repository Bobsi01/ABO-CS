# IMRaD research document and formatting record

## Independent recheck - 17 October 2026

At the user's request, a delegated evaluator independently inspected the actual DOCX properties and every one of its seven rendered pages. Requested Times New Roman typography, 10 pt body, 11 pt bold headings/Abstract label, two-column justified IMRaD structure, seven author records and preserved header/footer passed. The orchestrator made a fresh read-only Word render of the same DOCX hash (`8821101b9c3574e9a8fb283438e3699b7d4cf4c4b6b85cba903b2b1186b01470`); all seven raster pages are pixel-identical to the previous final render. All five figure input/output provenance hashes match. The actual document has no tracked insertions/deletions or comment anchors; all 47 long prose paragraphs resolve to justified alignment through their styles.

The independent reviewer identified a moderate Methods reproducibility limitation: the paper does not identify the exact archived earthquake subset/hash or original query selection rules. The local manifest identifies the CSV/hash, but the original download query was not found in the inspected records and must not be invented. NOAA processing/QC records could also be identified more precisely in the paper. A minor sample difference remains: citations use author-date style rather than the sample's bracket-number style. No manuscript changes were made during this recheck.

The generic structural accessibility checker reported one missing-table-header warning on the author layout table; both scientific tables have header flags. This is not a missing scientific header or a native accessibility pass. Native Word accessibility and screen-reader review remain unperformed. Independent final-page review is now completed for this exact hash. Full numerical reconstruction, fresh external scientific-source verification and app/browser QA were outside this document recheck.

Independent findings: `qa/current_review/independent_manuscript_20261017/report.md`. Fresh render and structural audit: `qa/current_review/recheck_word_20261017/`.

## PDF reference formatting revision - 17 October 2026

The current manuscript follows the supplied `Energy-Efficient-Processor-Architectures.pdf` layout: a large centered title, seven author blocks, two columns, indented justified text, an inline bold-italic abstract, centered Roman-numeral section headings and lettered subsections. Editable text and regenerated figure labels use Times New Roman. Body text remains 10 pt; section headings and the Abstract label are 11 pt bold; the title is 24 pt. The university header image and running title/page footer are retained. The scientific Markdown source is byte-identical to the pre-formatting version; only display headings and typography changed.

Microsoft Word 16.0 build 16.0.20326 rendered the saved DOCX read-only into seven pages. All seven pages were visually inspected; after the final Abstract-label adjustment, page 1 was inspected again and pages 2-7 were verified pixel-identical to the reviewed render. The actual DOCX audit reports no typography issues. All 79 source paragraphs, seven author records and both scientific tables match after display-only heading normalization. PDF text resources contain only Times New Roman variants. The two scientific figures retain their original input hashes and now use Times New Roman labels.

- DOCX SHA-256: `8821101b9c3574e9a8fb283438e3699b7d4cf4c4b6b85cba903b2b1186b01470`
- Markdown SHA-256: `b5c4ed8050a7195390b88173931540647a395980498850a376b1271601211274`
- Word PDF SHA-256: `bc45eb23b1d7f8e2286bf95c37dd3c3aeed9b03ed09780bb9069efc4113d2dd7`
- Reference PDF SHA-256: `9bf4f583f5b3b5830ee36ee26844739e52c600bc5f65df9edba2bdada95f3bbe`
- Internal evidence: `qa/current_review/times_reference_final_20261017/visual-and-content-review.json` and `word-render-audit.json`.

Project checks passed: Ruff lint/format, 219 Python/QA tests, frontend lint/type checks, 115 frontend tests and production build. Generated API files have no diff. These checks do not establish scientific predictive accuracy. Native Word accessibility, screen-reader review and an independent final-page review remain unperformed. The entries below retain earlier formatting and check results as historical records.

## Volcanic research revision - 17 October 2026

The user's revised scope makes the manuscript a descriptive secondary-data study of volcanic processes and hazard evidence from Taal, Mayon and Kanlaon. Taal's January 2020 eruption supplies the principal event case; the other volcanoes provide context without implying equivalent observational coverage. Software tests, implementation details, scenario outputs and numerical kernel formulations were removed from the paper. Earlier sections below describe archived computational-study versions and do not certify this new manuscript.

The current document retains seven supplied author records, the university header, and the running title/page-number footer. The title and footer text now match the volcanic research topic. The user's requested typography is Arial 10 pt body with 11 pt bold section headings. Body paragraphs and references are justified; the manuscript remains in two columns after the title/author block, with balanced final bibliography columns. It contains two scientific tables and two observational/source-digitization figures. No equations are needed for the revised descriptive study; no scenario calculation is presented as a volcanic observation.

Microsoft Word 16.0 build 16.0.20326 rendered the actual DOCX read-only into eight pages. All pages were visually reviewed. The final review verifies an exact match for all 79 source prose/heading/caption paragraphs and all seven author records. Source-derived population, seismicity and atmospheric-coverage summaries were checked against the retained data. The 23 outside-extent centroid records were independently recounted using WGS84 azimuthal-equidistant transforms (12 Taal, 4 Mayon and 7 Kanlaon). Contour areas and repeatability were checked against the archived trace comparison. Native Word accessibility, screen-reader review and an independent final-page review remain unperformed.

- DOCX SHA-256: `1e00f055dfdd1fe7bf4e567735b7c1b0ced9c701ea81ad88035ab8e35cfacbbc`
- Markdown SHA-256: `b5c4ed8050a7195390b88173931540647a395980498850a376b1271601211274`
- Word PDF SHA-256: `c868929705ac41604cc32630f318db806c4b01d136e8a11b09f990ee7b930a6e`
- Detailed internal evidence: `qa/current_review/volcanic_research_final_20261017/visual-and-content-review.json` and `word-render-audit.json`.

The figures are rebuilt with `uv run --no-project --with matplotlib==3.11.2 python scripts/build_volcanic_research_figures.py`. Their input/output hashes and limits are recorded in `docs/figures/volcanic-evidence-figures.json`. Rebuild the DOCX through `scripts/build_research_document.py` using the document runtime, then render with `qa/render_research_word.ps1`. The bundled LibreOffice renderer was attempted but unavailable; actual Microsoft Word and Poppler supplied the final page images.

Project checks: Ruff lint/format and 219 Python/QA tests passed. Generated API files had no diff; frontend lint and type checks passed. The frontend suite recorded 106 passes, five failures and two unhandled errors associated with concurrent Dashboard work outside the manuscript changes; the production build was not reached after those failures. These software results belong to this QA record and are not research findings in the paper.

## Current two-agent revision — 12 October 2026

The current editable DOCX incorporates census-selection corrections, the 3D/map snapshot distinction, an hour-only presentation example and the scope of the previous renderer benchmark. It retains IMRaD, Arial 11 pt body / 12 pt headings, seven editable equations and three tables/figures. Actual Microsoft Word 16.0 build 20326 rendered it read-only into **16 pages**. The independent scientific evaluator inspected every replacement page and audited the actual DOCX and PDF; all 162 prose/table paragraphs are present, Arial-only rendered fonts and editable equations pass. The orchestrator separately inspected pages 1, 7, 8 and 9.

Evidence is in `qa/current_review/word/` and `science-document.json` / `science-page-review.json`. DOCX SHA-256: `666ce8604ed6acfad35730b9c8330e613b421bd9ba170da2f99c54180ae2da3a`; actual Word PDF: `b2931607b35b7c88d9eaa15b9a616724b9474d27481b33d9fa8bd3b8bc64226f`. [Independent scientific review](CURRENT_SCIENCE_QA.md) closes the previous final-page review gate for this exact file. Native Word accessibility and speech remain unperformed. Earlier sections below refer to preserved older files and checks, including the 15-page 11 October artifact.

## Current actual-Word revision — 11 October 2026

The current [editable manuscript](ABO_RESEARCH_IMRAD.docx) incorporates the frozen protocol, reviewed inventories, actual wind coverage, two dependent contour traces, synthetic sensitivity and final browser/soak findings. It contains 15 pages, seven native editable equations, three numeric tables and three figures with alternative text. Arial is 11 pt for regular text/captions/references and 12 pt for headings/table headers. The original Google Doc remains preserved.

Microsoft Word COM 16.0 (build 16.0.20326) is available and rendered the actual saved DOCX read-only. `qa/research/word/word-render-audit.json` confirms its hash was unchanged. This supersedes the earlier Word-unavailable limitation below. `content-audit.json` verifies all 162 prose/table-cell paragraphs and Arial-only PDF fonts. `qa/gap_closure/independent-manuscript.json` uses the independent evaluator's saved script, executed by the orchestrator, to verify 357 text/math/drawing runs, exact sizes, equation structures, alternative text and matching render hashes; it reports no typography issues.

The orchestrator visually inspected all 15 rendered pages, covering headings, equations, tables, figures, references and page breaks. One ordinary paragraph beginning “Figure 3” was incorrectly recognized as a bold caption; the builder now recognizes numbered captions followed by a period. Replacement page 11 was reinspected; the other 14 PNG hashes are identical to already inspected pages. `qa/research/word/visual-review.json` records this chain. The current source/PDF hashes are:

- DOCX: `ac17b1d82696342c52538e36befd5a21387dd5a2d5d5ba57be784d8fe0df7c2e`
- Actual Word PDF: `d11a86361d03eb78541e6f48ebad31299cf16025d67b1e0210aa8b97e56c7b7c`

Independent scientific-content review passed before the final layout freeze. **Independent review of every final replacement page remains pending** because that agent reached the account usage limit. A saved independent script rerun by the orchestrator is not a new independent visual review. Word's native accessibility checker and screen-reader speech were not performed; tagged PDF output is narrower evidence. The PDF/PNGs are internal QA products.

Reproduce the current render with `./qa/render_research_word.ps1`, then run `qa/audit_research_document.py --pdf qa/research/word/ABO_RESEARCH_IMRAD.pdf --output qa/research/word/content-audit.json` with the bundled Python. Rebuilds invalidate the current hash-bound review. [GAP_REGISTER.md](GAP_REGISTER.md) records the remaining gates.

## Earlier 10 October revision

Prepared 10 October 2026 for the user's confirmed **editable Word file** choice. The requested format is Arial 11 pt for regular text and Arial 12 pt for headings. The original Google Doc and local proposal snapshot were preserved.

## Deliverable and structure

The editable manuscript is [ABO_RESEARCH_IMRAD.docx](ABO_RESEARCH_IMRAD.docx), built from [ABO_RESEARCH_IMRAD.md](ABO_RESEARCH_IMRAD.md). It contains an abstract, introduction, methods, results, discussion with a conclusion subsection, and twelve references. The author/course line comes from the source proposal; no individual author names or approval were invented.

The document uses Letter portrait pages, one-inch margins, 1.15 body spacing, black text, numbered pages, Arial 11 pt body/reference/caption text, and Arial 12 pt titles, headings and table headers. Three numeric tables have explicit column widths, light gray borders, repeated headers and flexible row heights. Seven native Word equations contain editable fractions, powers and subscripts; their base run size is Arial 11 pt. Fraction and script glyphs scale naturally within the equation layout.

## Research trace and evidence boundaries

The manuscript synthesizes the original proposal, [computation documentation](COMPUTATION.md), [eruption model](ERUPTION_MODEL.md), [research applicability](ERUPTION_RESEARCH.md), [geographic sources](GEOGRAPHY_REFERENCES.md) and [further QA record](FURTHER_QA.md). Primary publisher and agency pages were revisited for the Taal deposit study, the Jeffreys lava-speed relation, Tephra2, building/lava impacts, dated Mayon context and selected geographic/population sources. Literature references are included in the manuscript.

The 107 Python / 47 frontend test totals describe the recorded final implementation checks. They were not rerun for this document-only change. The numerical example uses the saved `data/examples/mayon-eruption-request.json`, and a fresh local `/api/eruption-sequences` request during manuscript preparation reproduced 36,000,000 kg emitted, 30,459,336.28543452 kg deposited inside the domain and 5,540,663.714565478 kg outside after complete settling. The two rounded table values sum to the rounded emitted total.

Physical teaching inputs remain labeled assumptions. No empirical Taal error, forecast accuracy, learner-effectiveness result or damage threshold was invented. The locally curated Taal footprint discrepancy and separate Chrome pacing observation remain visible. Source-backed mechanisms and dated context do not validate the displayed plume appearance or lava runout.

## Document verification

- **Typography and structure PASS:** [format-audit.json](../qa/research/format-audit.json) checks 329 text/math runs, six ordered main sections, three tables and seven native equations. Body and heading sizes match the request exactly.
- **Content completeness PASS:** [content-audit.json](../qa/research/content-audit.json) finds all 140 prose/table-cell paragraphs in the actual DOCX render. Native equation structures are counted separately and visually reviewed.
- **Rendered font PASS:** the PDF resources contain Arial and Arial Bold only, including the equations. The delivered DOCX XML contains no evaluation markings.
- **Visual review PASS within the available renderer:** the orchestrator inspected all ten initial pages, and the independently spawned research QA agent inspected all ten replacement pages after its reported findings were corrected. The orchestrator also inspected replacement pages 1 and 5. Review covered headings, equations, captions, table spacing, clipping, page breaks and reference wrapping. Both input tables fit on one page. The final reference is present on the final page. The review record is [render-audit.json](../qa/research/rendered/render-audit.json).
- **Targeted script checks PASS:** Ruff lint and formatting for the builder, renderer and content-audit scripts. Scientific and UI implementation files were not changed by this task.

The skill's bundled LibreOffice renderer was attempted but `soffice.exe` is unavailable in this Windows runtime; Word COM is also unavailable. The fallback rendered the **actual DOCX** with Aspose.Words 26.9.0 evaluation. Its evaluation markings were retained in the internal PNG/PDF artifacts, and it never saved or altered the source DOCX. The text-completeness comparison ignores only the renderer-added footer/page-number prefix in extracted text; it does not modify the PDF or images. Word/LibreOffice pagination and accessibility are not independently certified by this check. The QA PDF is not a deliverable.

## Independent follow-up and corrections

At the user's request, one separate QA agent evaluated the output without editing the manuscript or implementation. Its [independent report](RESEARCH_INDEPENDENT_QA.md) records formatting, equations, primary-source review, scalar numerical reproduction and inspection of every initial/final page.

Two presentation/clarity findings were corrected by the orchestrator: the inherited blue bottom border in the Word Title style was removed, and Methods 2.5 now defines the adopted gravitational acceleration `g = 9.80665 m/s²`, matching the implementation. The reviewer independently verified both changes, all final pages, typography/content, final time and mass totals. Its scalar integration reproduces the inside-domain mass within approximately 3.73 × 10⁻⁹ kg. No further blocking manuscript defect was identified. Historical model agreement remains unestablished.

The reviewed replacement DOCX SHA-256 is `26086a8818fce6a931c851abeb6783fdd125ed6c55dd0dafd713c3c152c0559d`. A separate [orchestrator live-example record](../qa/research/live-example-evidence.json) preserves the saved request hash and final endpoint diagnostics; it is distinct from the reviewer's independent evidence.

## Reproduction

The scripts use the desktop's bundled Python 3.12 runtime with python-docx and pypdf. Aspose is loaded in a temporary uv environment for optional QA rendering; no application dependencies were added.

```powershell
$researchPython = 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
& $researchPython scripts/build_research_document.py
uv run --no-project --python $researchPython --with aspose-words==26.9.0 python qa/render_research_document.py
& $researchPython qa/audit_research_document.py
uv run --project backend ruff check scripts/build_research_document.py qa/render_research_document.py qa/audit_research_document.py
uv run --project backend ruff format --check scripts/build_research_document.py qa/render_research_document.py qa/audit_research_document.py
```

Rebuilding resets the render-review status to pending. Inspect every new rendered page before recording another visual pass. The content audit stores the reviewed DOCX/PDF hashes so later changes can be identified.
