# Independent research-document QA — 10 October 2026

**Result: PASS for the requested IMRaD structure, typography, document completeness and checked computational claims after two minor corrections.** This is a manuscript and reproducible-example review, not empirical eruption validation.

The evaluator reviewed `ABO_RESEARCH_IMRAD.docx` and its Markdown source independently of the author’s PASS records. The evaluator changed only this report and `qa/research/independent-*` evidence. Manuscript/builder corrections were made by the orchestrator. Application code, scientific datasets and the original proposal were not changed by this review.

## Findings and correction retest

| Finding | Original evidence | Final independent result |
| --- | --- | --- |
| P3: inherited rule beneath the title | Original page 1 displayed a blue horizontal rule. The DOCX `Title` style contained `w:pBdr/w:bottom` with `w:color="4F81BD"`, contrary to the document skill’s explicit instruction to use whitespace beneath a title. | The builder clears the inherited border. Final XML has no Title border; final page 1 shows its removal. PASS. |
| P3: gravitational acceleration not defined | Methods 2.5 / Equation 7 used `g` without its unit or adopted value, while `backend/src/abo_api/eruption.py:27` uses 9.80665. | Methods 2.5 now defines gravitational acceleration `g = 9.80665 m/s²`. Independently inspected final page 5 and source wording. PASS. |

No unresolved blocking document defect was found in the final artifact. Letter page size, 1.15 spacing, bold 11 pt captions and ordinary reference formatting were accepted: the user requested IMRaD, Arial 11 pt regular text and 12 pt headings, and did not request a particular journal or APA layout.

## Independent checks

- **Structure and typography:** ordered Abstract, Introduction, Methods, Results, Discussion and References; conclusion is within Discussion. XML/direct formatting checks covered 330 body/table/math runs with no mismatch: Arial 11 pt regular text and native-equation base runs; Arial 12 pt title, section/subheadings and repeated table headers. All three footer field runs separately specify Arial 11 pt. Fraction/subscript glyphs scale naturally in native equations.
- **Editable mathematics and tables:** parsed all seven OMML equations, including numerator/denominator and subscript/power structures, against the Markdown formulas and current `kernel.py` / `eruption.py`. Wind-from signs, mass allocation, variance, normal-CDF cell integration, thickness conversion, finite-source clipping and the lava mean-speed relation agree. Three tables match the saved scenario and calculated values. Grain fractions sum to one; bulk deposit density is distinguished from particle/lava density.
- **Document completeness:** independently extracted the actual PDF and matched all 140 prose/table-cell paragraphs. Five initial raw-text misses were caused by renderer-added footer/page-number prefixes inserted between split paragraphs. Removing only those known prefixes in memory restores every complete paragraph; no PDF/image/source content was modified. All seven equations and the final reference were also visually inspected. No tracked changes, comment anchors or evaluation text occur in the delivered DOCX XML.
- **All-page visual review:** independently inspected original and replacement pages 1–10 individually at original image resolution. Final headings, all equations, three tables and wrapped reference URLs are readable, without clipped text, missing glyphs, broken rows or orphan headings. Both input tables fit on page 3; results Table 3 is on page 7; the final two references appear on page 10. Evaluation marks remain visible only in internal renders.
- **Fresh numerical reproduction:** the independent script uses scalar `math.erf`/`erfc`, not the application’s NumPy kernel. The synthetic example gives 0.015915494309189534 kg/m² point load and 14,663.149630841179 kg in the centered square, agreeing with the paper’s rounding. For the saved Mayon request, independent whole-domain integration gives 30,459,336.285434518 kg inside and 5,540,663.714565482 kg outside. A fresh local endpoint request gives 37 frames, final time 100,475 s, 36,000,000 kg emitted, zero still aloft and the paper’s mass totals; inside-mass difference is only 3.73 × 10⁻⁹ kg. Lava stop is `effusion_volume_limit`.
- **Claims and provenance:** current catalog contains 121 municipal records and two airports. Recorded 107 Python / 47 frontend passes, 26/four added cases, source-audit counts, eight independent correction retests and separate 60 fps / 1 fps observations trace to the prior QA reports. Those full suites and browser performance measurements were not rerun during this document-only review. The manuscript describes them as recorded/context-specific evidence. Assumed inputs, missing historical observations, incomplete municipal coverage and unavailable damage criteria remain explicit.

## Primary-source review and valid counterexamples

Fresh [publisher text for the Taal study](https://link.springer.com/article/10.1007/s00445-022-01534-y) confirms the 17–21 km above-sea-level plume range, narrative 8,605 km² deposit area and later lava fountaining. The independently retrieved [indexed full-text Table 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC8889389/) shows 3,864.89 km² at 0.05 cm, equivalent to 0.5 mm. Direct Springer table access failed and later PMC access returned CAPTCHA; this numerical table check is indexed primary-text evidence, not a freshly displayed table image. Preserving the two areas and withholding spatial-overlap metrics is appropriate.

The accessible [Nature article-in-press PDF, page 6, Equation 3](https://www.nature.com/articles/s43247-025-02991-x_reference.pdf) independently gives the Jeffreys mean-speed relation with denominator `3μ`. Its authors and title match the reference. This supports the relation, not measured Mayon rheology or ABO runout. The [official Tephra2 repository](https://github.com/geoscience-community-codes/tephra2) defines height-dependent wind inputs and accumulated tephra outputs, supporting the paper’s limited comparison without full-model equivalence. The [USGS buildings page](https://volcanoes.usgs.gov/volcanic_ash/buildings.html) supports condition-dependent roof impacts and its stated 2015 modification date.

Valid counterexamples were retained: a numerical PASS does not imply historical predictive accuracy; a centroid population total is not measured person-level exposure; ground airport ash is not airborne flight safety; reference literature does not validate teaching parameter values; and a renderer watermark does not contaminate the unchanged DOCX. No new requirements for participant experiments, double spacing or a journal citation style were invented.

## Artifact identity and evidence limits

| Artifact | Original reviewed SHA-256 | Final independently reviewed SHA-256 |
| --- | --- | --- |
| DOCX | `3ef88e898f590fe0557d009f1dc3141655db69a2e93b6c3f30ecfaac019c8a3a` | `26086a8818fce6a931c851abeb6783fdd125ed6c55dd0dafd713c3c152c0559d` |
| Internal rendered PDF | `6a3ebcc92c9bb21d36b79a15a12748ad247c06191d212819f1351142cba503d4` | `b790d2801d3daa5347c5ea9dab40525c695112f8b08bf814ea2e2b10b9e82226` |

Hashes matched the content-audit/render handoff before image review. The final render has ten pages and only Arial/Arial Bold font resources. The actual DOCX was rendered using Aspose.Words 26.9.0 evaluation because bundled LibreOffice and Word COM are unavailable. Its evaluation marks were retained. This review does not certify Microsoft Word pagination, LibreOffice behavior, screen-reader accessibility or instructor acceptance. It does not establish event-specific calibrated physical inputs, empirical Taal agreement or damage prediction.

Independent reproducible evidence: [independent-evidence.json](../qa/research/independent-evidence.json), generated by [independent-audit.py](../qa/research/independent-audit.py). Run with the bundled Python containing lxml and pypdf while the local API is running. The reviewer script passes Ruff lint and formatting; it writes only its own JSON evidence.
