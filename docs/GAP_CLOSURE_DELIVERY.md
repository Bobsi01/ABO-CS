# QA gap-closure delivery — 11 October 2026

The application retains the reduced ash/lava teaching models and the blue, progressively disclosed workspace. This revision implements evidence classification, a frozen retrospective protocol, explicit inventory coverage, census-year and conditional-screening contracts, historical source geometry and additional graphics recovery. [GAP_REGISTER.md](GAP_REGISTER.md) is the authoritative list of closed items, failed evaluations, source blocks and retained limitations. Numerical/contract checks, final browser recovery/export retests and actual Word formatting/content/all-page orchestrator review pass. Historical validation, full cleanup and independent final integration/page review remain open.

Three specialists were spawned, plus the orchestrator. The scientific specialist completed its handoff; engineering and independent QA saved their work before reaching the account usage limit. The orchestrator completed integration and ran saved independent cases without claiming a replacement independent review. No additional agents were spawned.

Recorded checks pass 142 Python tests and 56 frontend tests with lint/format/types/build. Three measured foreground replays per browser exceed 30 fps on the documented machine and matched settings. The 30-minute soak completes, but its resource-growth finding remains open. Actual hidden-page transition, native 200% browser zoom, screen-reader speech and native Word accessibility evidence are not established.

## Scientific evidence

- [EVALUATION_PROTOCOL.md](EVALUATION_PROTOCOL.md) freezes `taal-main-plume-2020-v1` before agreement or tuning. The mapped main interval is 55,680 seconds; alternate event definitions, height datums, group leakage rules and absent acceptance tolerances are explicit.
- [PARAMETER_REGISTER.md](PARAMETER_REGISTER.md) and catalog `parameter_evidence` identify measured, derived, assumed and calibrated values with units, source locators, uncertainty, license and dependencies. No parameter is currently calibrated.
- Actual Tanay IGRA records, source formats and station metadata are archived in `data/source/igra/`. Both selected launches fail the frozen vertical-coverage gate: 15/21 heights, 71.43%, below 75%. No reviewed effective wind is returned.
- Actual PMC source files and two independently frozen traces are in `data/source/taal-study/`. Their local-projection IoU is 0.97918024, comparing digitizers of one published contour rather than model predictions. The source narrative/table area discrepancy, original uncertainty and approximately 5% domain clipping remain visible.
- The catalog contains 318 municipal/city records and two airports. All 318 included 2024 source pairs and 34 Batangas 2020 counts were independently checked. `data/source/domain-inventory.json` lists included, unresolved and retained outside-domain records. Missing historical populations remain unknown.
- `data/source/source-investigations.json` records rejected or blocked facility/criteria candidates. No universal damage threshold or unverified facility coordinate was invented.

[COMPUTATION.md](COMPUTATION.md) traces inputs to equations, numerical arrays, screening, grouped evaluation and scene quantities. [INPUT_VALUES.md](INPUT_VALUES.md) identifies required measurements and teaching defaults. The local 16-to-32 release-layer change of 18.28% at the saved test point leaves convergence unestablished; stable total mass does not remove this approximation.

## Application and research artifacts

Python owns additive API contracts and generated TypeScript declarations. Existing routes remain available. The catalog exposes evidence and inventory coverage; simulation requests select census year and screening context; unknown applicability carries reasons. The historical response exposes protocol/dataset, dependencies and both derived reference contours even when physical inputs block a simulation. Interval and midpoint metrics are distinct, with `rmse_mm` retained as interval-distance RMSE.

The editable IMRaD manuscript is [ABO_RESEARCH_IMRAD.docx](ABO_RESEARCH_IMRAD.docx), sourced from [ABO_RESEARCH_IMRAD.md](ABO_RESEARCH_IMRAD.md). It uses Arial 11 pt regular text, 12 pt headings/table headers, seven native editable equations, three numeric tables and three scientific figures. Figures show actual wind coverage, dependent contour digitizations and explicitly synthetic sensitivity; no unavailable historical residual plot is fabricated.

The actual Word render and orchestrator page review are recorded in [RESEARCH_DOCUMENT_QA.md](RESEARCH_DOCUMENT_QA.md); independent replacement-page inspection is pending. Source/Python/API/browser/manuscript retests and their limits are recorded separately by [independent QA](GAP_CLOSURE_INDEPENDENT_QA.md), with an explicitly attributed orchestrator appendix. The engineering record is [ENGINEERING_GAP_EVIDENCE.md](ENGINEERING_GAP_EVIDENCE.md). Rendering tags or automated accessibility scans alone do not establish screen-reader usability.

## Reproduction

In PowerShell at `C:\Workspace\ABO-CS`, install and start the local application:

```powershell
./scripts/setup.ps1
./scripts/start.ps1
```

Open http://127.0.0.1:8000. Scientific inputs, terrain, coastline, simulation, map/table and exports operate locally after installation; optional MapTiler presentation requires a user-provided public key. Reload open tabs after replacing a production build. No database or cloud service is required.

Reproduce the scientific checks from `backend/`:

```powershell
uv run pytest tests ../qa
uv run ruff check src tests ../qa/gap_closure
uv run ruff format --check src tests ../qa/gap_closure
uv run python ../qa/gap_closure/scalar_igra_audit.py
uv run python ../qa/gap_closure/audit_source_trace.py
uv run python ../qa/gap_closure/audit_inventory.py
uv run python ../qa/gap_closure/audit_api.py
```

Run `npm run check` from `frontend/`. Regenerate shared declarations with `npm run api:types` and verify there is no generated-contract drift. Saved teaching requests are under `data/examples/`; final exports retain the completed request's context rather than unsent edits.

Research generation uses the bundled Python libraries and a pinned temporary Matplotlib environment. Microsoft Word COM renders the saved DOCX read-only:

```powershell
$researchPython = 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
uv run --no-project --python $researchPython --with matplotlib==3.10.7 python scripts/build_research_figures.py
& $researchPython scripts/build_research_document.py
./qa/render_research_word.ps1
& $researchPython qa/audit_research_document.py --pdf qa/research/word/ABO_RESEARCH_IMRAD.pdf --output qa/research/word/content-audit.json
```

Every rebuilt document resets visual review to pending. The reviewed DOCX/PDF hashes identify the exact artifacts; the PDF and page images are internal QA products. [DEMONSTRATION.md](DEMONSTRATION.md) gives the classroom sequence. Academic surface-deposition screening does not establish building safety, water potability or airborne aviation safety.
