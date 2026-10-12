# Comprehensive ABO QA and corrections — 12 October 2026

Reviewed the fresh private-repository clone at baseline `b46f13f866e82412937a080a2e46443d10bea4f1`. Two independent evaluators covered scientific/backend behavior and application/browser behavior; the root agent owned implementation, integration checks and manuscript review. New fixes and evidence are on local branch `codex/comprehensive-qa-20261012`. No commit or publication was requested or performed.

The review reproduced defects beyond the existing passing suite. Corrections preserve the scientific equations, curated numerical inputs, one-degree wind resolution, source gates and blue interface. Software verification remains separate from historical predictive accuracy.

## Findings and corrections

| Severity | Verified problem | Correction and evidence |
| --- | --- | --- |
| P1 | All bundled wind sweeps returned 422 after the catalog expanded to 320 receptors. The original 360-bearing memory estimate was 595,207,680 bytes, above 512 MiB. | Process 16-bearing batches with running receptor maxima and shared admission accounting. All Taal/Mayon/Kanlaon API sweeps pass; independent scalar references also agree at the maximum five-grain, 32-layer, 2,048-receptor and 400-cell contract. Exact ties still choose the lowest bearing. |
| P2 | Incomplete response validation admitted malformed catalog/evaluation fields, blanking the entire workspace. Six browser fixtures reproduced null criteria, invalid blocked inputs/reference rows/parameter values and non-text observation groups. | Validate consumed criterion/evidence/reference/group shapes before storing API results; dictionary checks exclude arrays. All six browser corruption cases now expose the existing actionable error and retain the application. Counterexamples exercise legitimate null/string/number/list values. |
| P2 | Repeated view cycles retained retired canvases through live document keyboard listeners. Forced-GC metrics grew by 1,180 listeners and 6,342 nodes over 20 cycles. A detached-view heap snapshot identifies document → bound OrbitControls handler → retired canvas; map-only remounts are stable. | Capture the original keyboard-listener root when creating controls and remove the locked Three r186 capture handlers there during disposal. Three real-runtime regressions cover detached document/shadow roots and repeated attached cleanup. Independent browser cleanup retest is recorded below. |
| P3 | Windows API generation wrote CRLF into the LF-designated OpenAPI file, creating a status-only modified file although the normalized generated-contract diff was empty. | Export with explicit UTF-8/LF. Fresh type generation produces no contract content or working-tree drift. This changes serialization line endings only. |

Root implementation: `backend/src/abo_api/kernel.py`, `service.py`, `frontend/src/api/simulator.ts`, `components/orbitControlsLifecycle.ts`, `components/VolcanoScene.tsx`, and `scripts/export_openapi.py`. No contract fields or scientific source data changed. The existing AST checks now permit only one bounded bearing-orchestration loop, retaining the ban on Python cell/grain/receptor loops and `np.vectorize`. A reduced synthetic budget still rejects before entering the sweep kernel.

The camera compatibility shim names two private handlers in the locked Three r186 runtime because its public `dispose()` removes them from the wrong root after detachment. Dependency upgrades must revisit that shim and retain the real-runtime detached-root regression tests. No installed/vendor source was patched.

## Fresh verification

| Area | Evidence and observed scope |
| --- | --- |
| Locked installation | `uv sync --locked`, frontend `npm ci`, optional QA `npm ci`; Python 3.12.14, Node 24.18.0, uv 0.12.17. Both npm install audits reported zero known vulnerabilities; `uv pip check` passes. This is not a penetration test or universal dependency-safety guarantee. |
| Python integration | **188 tests pass**, including 19 fresh independent scalar/API cases and five sweep regressions. Ruff lint and formatting pass with the explicit backend configuration. |
| Frontend integration | **86 tests pass**; ESLint, TypeScript, production build and regenerated-contract comparison pass. The remaining roughly 969 kB scene chunk produces Vite's size warning; the scene is already loaded lazily. |
| Sweep resource measurement | Largest accepted sweep: 357,063,680-byte conservative estimate; fresh-process Python/NumPy traced peak 130,210,949 bytes; 2.49 s on this machine. Traced allocation is narrower than total OS RSS and says nothing about GPU use. |
| Production packaging | Documented `scripts/start.ps1 -Port 8012` serves API and build on loopback. Fifteen actual HTTP checks pass: SPA route, API/schema/catalog, missing API/assets, environment/backend/data files, documentation traversal rejection and served manuscript/documentation. |
| Offline display assets | Three 401×401 packaged elevation assets and coastline/lake context pass geometry/finite/origin checks. Four retained manifest hashes and actual served bytes agree. Optional raw ignored terrain caches were not fetched or re-curated. |
| Scientific source and model audit | Independent reviewer verifies 27 retained source/derived hashes, unique identifiers and source references. Cardinal/oblique cell integration, mass accounting, legal extremes, scalar receptor/sweep calculations, finite-source snapshots, leakage rejection and unavailable historical status pass. Hash consistency does not certify original measurements. |
| Browser workflows | Actual production Taal and Mayon/lava runs, matched request context, stages/slider, map inspector, CSV/JSON, stale drafts, manual comparison, cancel/retry, 503/non-JSON/malformed responses, offline terrain/geography fallback, reduced-motion transition, keyboard camera/selectors, context-loss event recovery and both 320 px themes. Injected context loss is a synthetic event, not a native driver-failure test. |
| Accessibility sample | Named/focusable camera canvas, visible outline, keyboard selectors/disclosures and skip-link activation pass. Sampled opaque DOM text minima at 320 px: 5.40:1 light / 6.20:1 dark. Fifteen sampled visible buttons per theme meet 44×44 px. Raster scenes/maps, disabled/translucent controls, speech and native zoom are outside this sample. |
| Research manuscript | Fresh read-only Microsoft Word 16.0 build 20326 render: 16 pages; all 162 prose/table paragraphs present; 211 checked text runs meet Arial 11 pt body/12 pt headings; seven native equations, three tables and three figures. Root inspects every page in eight readable pairs, with no observed clipping/overlap/missing glyphs. DOCX SHA-256 remains `666ce8604ed6acfad35730b9c8330e613b421bd9ba170da2f99c54180ae2da3a`; new Word PDF hash is `73b2d232139f322099f051869b7d2b4935cb9701fe86b8a2f76142448d6a64ee`. Pair previews were resized by the viewer; full PNGs are retained. |
| Remote baseline CI | The downloaded baseline has a [successful Linux verification run](https://github.com/Bobsi01/ABO-CS/actions/runs/38199454646). That prior run does not certify these uncommitted local corrections. Local final gates are recorded independently. |

## Cleanup correction retest

Independent final build: `index-D9xPQGL8.js` / `VolcanoScene-mQbEhHZk.js`. All 18 main workflow cases, six functional resilience checks and six response-corruption fixtures pass with no unexpected page errors. The seventh resilience entry records an attempted actual-visibility test that produced no hidden event; that gate stays open.

Twenty actual run/remount cycles after forced GC keep event listeners at **1,278**, a **zero** increase; nodes move from **11,268 to 11,271**, with **4,587 visible nodes**, one scene canvas and one map throughout. All five sampled 400 ms paused windows make **zero** GL draw calls. Before correction, the matched 20-cycle sequence added 1,180 listeners and 6,342 nodes.

Separate settled remount-only controls wait 1,500 ms, collect garbage and wait another 250 ms. Ten cycles have zero listener growth and two extra nodes for both views, map only and scene only. The corrected Guide-unmounted snapshot has **zero OrbitControls objects** and **zero engine canvases retained by document shortcut handlers**, versus eleven document-retained engine canvases in the original application reviewer path extraction. The separate science graph analysis counted twelve native detached canvases/controls under its wider classification; both reports preserve their definitions rather than claiming identical counts.

Evidence: `cleanup-fixed-lifecycle.json`, `cleanup-fixed-retention-attribution.json` and `cleanup-fixed-guide-unmounted-paths.json` in the application folder. The identified document-listener leak is closed by these retests. JS heap warms by 2.88 MB over the 20 runs; one WebGL context remains in the unmounted snapshot, so this is not an all-object/GPU or 30-minute cleanup certification. The original counters, settled controls and actual retaining paths are retained separately, without relabeling failing evidence.

## Remaining gates and interpretation

Historical eruption validation remains source blocked. The accepted plume-level wind, independent ash mass/bulk density/grains, historical vent datum, independent deposit observations and defensible predictive tolerances remain unavailable. Both retained soundings cover 15/21 fixed heights (71.43%), below the frozen 75% gate. Two derived contour traces describe one dependent publication. No new empirical fit, predictive score, safety threshold or municipal source value was invented.

Administrative and historical population coverage, water-facility data and condition-specific damage criteria remain incomplete. Local release-height convergence remains unestablished. Uniform-wind, flat-ground ash and isothermal single-channel lava assumptions remain explicit model limitations. Surface ash at an airport is not an airborne aviation assessment.

Full current-renderer matched-settings foreground performance, a 30-minute corrected-build soak, native browser 200% zoom, screen-reader speech and native Word accessibility checks remain unestablished. Both headless and one isolated headed Chrome attempt failed to produce an actual hidden-document event; this is an evidence limitation, not a demonstrated failure of the application's mocked visibility handler. No universal graphics, complete accessibility or leak-free certification is claimed.

Jev decision support was considered for review/prioritization; no TypeSafe/Jev process API key was available. The work continued through direct code/source inspection, deterministic fixtures, real browser evidence and independent evaluators. No model judgment substitutes for measured checks.

## Reports, evidence and reproduction

- [Independent science/backend report](COMPREHENSIVE_SCIENCE_QA_20261012.md)
- [Independent application/browser report](COMPREHENSIVE_APP_QA_20261012.md)
- `qa/comprehensive_20261012/science/`: independent cases, before/after sweep captures, source state, JUnit and retaining-path analysis.
- `qa/comprehensive_20261012/app/`: baseline/final workflows, response corruptions, screenshots, lifecycle/attribution controls and heap snapshot. Historical evidence outside this new folder is preserved.
- `qa/comprehensive_20261012/integration/`: lint/test/type-generation logs, JUnit, packaging/asset/build hashes, sweep allocation and fresh read-only Word render/content/font/page evidence.

From the repository root:

```powershell
uv run --project backend ruff check --config backend/pyproject.toml backend scripts qa
uv run --project backend ruff format --check --config backend/pyproject.toml backend scripts qa
uv run --project backend pytest backend/tests qa
Set-Location frontend
npm run api:types
npm run check
Set-Location ..
git diff --exit-code -- frontend/openapi.json frontend/src/api/schema.d.ts
./scripts/start.ps1 -Port 8012
```

With the production app running and the separately locked QA dependencies installed, run the new browser helpers using a new `ABO_QA_SUFFIX` to preserve evidence. `audit_document.py` requires Codex's bundled artifact Python and a fresh Word PDF in its assigned output directory; it does not edit the manuscript. The root QA report identifies integration work separately from independent evaluator findings. Test counts and successful fixtures establish their observed scope, not exhaustive correctness.
