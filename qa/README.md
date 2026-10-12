# Verification and retained evidence

`comprehensive_20261012/` holds the fresh-clone comprehensive review: independent `science/` and `app/` cases, before/after failures, renderer retaining paths, correction retests, and `integration/` logs/packaging/Word checks. Its 19 scientific cases are discovered by the standard full Python command. New browser runs should use a new `ABO_QA_SUFFIX` and an explicit `ABO_QA_URL` when needed; preserve prior outputs. `docs/COMPREHENSIVE_QA_20261012.md` integrates the current 188 Python / 86 frontend checks and their limits. The new OrbitControls wrapper targets the locked Three r186 listener-root behavior; detached-root tests must remain when changing that runtime.

`current_review/` preserves the earlier 12 October two-agent science/app review, correction retests, catalog comparison and actual-Word replacement pages. Its `test_current_science.py` contributes 22 independent cases to standard full-suite discovery. See `docs/CURRENT_QA_DELIVERY.md` for that dated evidence and its scope.

`backend/tests/` and the `qa/test_*.py` / `qa/gap_closure/test_*.py` cases run through the locked backend environment. Frontend tests run through `frontend/package-lock.json`. See [CONTRIBUTING.md](../CONTRIBUTING.md) for the standard checks.

`browser/` preserves scripts, screenshots, telemetry and before/after failure evidence. `gap_closure/` contains independent scientific audits and saved browser cases. `research/word/` preserves actual Microsoft Word render evidence; `research/rendered/` is the earlier evaluation-renderer record. Old failures are evidence, not current expected outputs. Existing JSON reports contain historical machine paths and timestamps intentionally; new executions need their own attribution.

## Optional browser tools

The application does not depend on Playwright. Install the separately locked QA dependency when rerunning browser helpers:

```powershell
Set-Location qa
npm ci
Set-Location ..
node qa/browser/gap-engineering-workflows.cjs
```

Start the production app on port 8000 first. Browser helpers target an installed Google Chrome (`channel: 'chrome'`). Most overwrite their named reports; save existing evidence before a rerun. Foreground performance requires a visible, unoccluded browser, the recorded viewport/settings and native foreground evidence. Headless functional results do not establish the 30 fps gate.

`playwright-runtime.cjs` resolves the local QA installation. An existing external Playwright installation can be used by setting `ABO_PLAYWRIGHT_MODULES` to its `node_modules` directory; this is optional and has no author-specific default path. The in-app browser cases require that browser's supported automation surface, and native foreground sampling is Windows-specific.

The two `.heapsnapshot` files use Git LFS. Download them with `git lfs pull` before retained-object analysis. The application, CI numerical tests and frontend build do not require those snapshots.

## Optional research tools

Use a separate environment for document tooling; these packages are not application dependencies:

```powershell
uv venv .runtime/research --python 3.12
uv pip install --python .runtime/research/Scripts/python.exe python-docx lxml pypdf pypdfium2 matplotlib
.runtime/research/Scripts/python.exe scripts/build_research_figures.py
.runtime/research/Scripts/python.exe scripts/build_research_document.py
./qa/render_research_word.ps1
.runtime/research/Scripts/python.exe qa/audit_research_document.py --pdf qa/research/word/ABO_RESEARCH_IMRAD.pdf --output qa/research/word/content-audit.json
```

This optional environment is not locked; record tool versions with each new evidence run. Install Arial for matching figures and document layout. Microsoft Word COM rendering requires Windows with licensed Word and no existing Word session. The renderer opens the manuscript read-only. Inspect the rendered replacement pages and update hashes/evidence after rebuilding. The older `render_research_document.py` requires Aspose.Words and retains its evaluation markings; it is a fallback with explicit layout limitations, not Word equivalence.

See [current gap register](../docs/GAP_REGISTER.md) for unfinished lifecycle, accessibility, source and independent-review gates. Retained logs and successful tests must not be relabeled as empirical validation.
