# ABO independent QA report

Reviewed on 2026-10-08 (Asia/Manila). Scope: project context, skill selection and practical usefulness, then the Python + React development foundation. The evaluator owns this report and does not modify the implementation under review.

## Status and evidence boundaries

- **Skill structure:** PASS. The bundled `skill-creator/scripts/quick_validate.py` returned `Skill is valid!` for each newly authored ABO skill.
- **Practical skill assessment:** useful safeguards demonstrated on Cases A and B below; a limited, supplied-case evaluation rather than a blind benchmark.
- **Foundation tooling and live HTTP:** PASS, independently observed locked installs, Python/frontend quality gates, unchanged regenerated contracts and actual local/proxied health responses. See the validation record below.
- **Advertised Node compatibility:** PASS after correction. Package/lock metadata and docs now require Node 22.13+ within 22.x or Node 24+, with strict engine checking. This is dependency metadata evidence; actual Node-22 execution remains unverified.
- **Browser UI:** applicable starter checks PASS as reported by the implementing agent through CUA. Independent QA observed source/HTTP/tooling evidence; rendered interaction evidence is attributed separately below.
- **Scientific validity:** not established. No deposited-ash kernel, curated environmental dataset, hazard criteria, or historical observations have been validated.

The first pass read `PROJECT_CONTEXT.md`, `repository_map.md`, `docs/source/PROJECT_PROPOSAL.md`, `data/README.md`, the three ABO skills, and the local anti-slop core/UI skill. Initial Git status contained only untracked preparation files; `docs/QA_REPORT.md` did not exist, so creating this separately owned report did not overwrite another change. At first pass, the map included intended foundation paths that were not yet created. After the ready-code handoff, the mapped foundation files exist and `AGENTS.md` routes computation, application, QA and UI work to the appropriate local skills. It records the already selected DURING mode. The evaluator also read architecture/development/design/skill documentation and the actual implementation/configuration files.

## Proposal and context review

The local context faithfully distinguishes the retrieved proposal from new engineering choices. The snapshot identifies its document, tab and revision, and explicitly limits retrieval to extracted paragraph text. This evaluator checked the snapshot against the context; it did not independently reread Google Docs, other tabs, images, comments, or the historical event.

The context preserves the proposal's loop-free grid/class objective, three to five grain classes, roughly 200 by 200 km domain and 1 km resolution, steady eruption/uniform wind/flat terrain, three named volcanoes, manual scientific inputs, municipal centroids and population counts, threshold outputs, airport indicator, January 2020 Taal comparison, and 360-degree wind sweep. It correctly records that aviation is mentioned in the general objective while water contamination appears in the detailed objectives/features. It also retains the academic-use limitation and marks approval as unestablished because the signature is blank.

The no-external-scientific-data-API constraint is preserved. Permitting a local Python-to-React HTTP interface is an explicit engineering interpretation, not a statement that the instructor approved HTTP. Grid cell conventions, the actual deposition equation, release height, diffusion, grain properties, input sources and threshold criteria remain unresolved rather than being supplied from memory. These distinctions make the foundation reviewable without implying that the proposed simulator is already implemented.

## Skill provenance, routing and quality

| Artifact | Provenance | Correct route and observed value | Limits or action |
| --- | --- | --- | --- |
| `antislop.md` and `skills/antislop-ui/SKILL.md` | Copied from locally installed anti-slop skills; not newly authored ABO science skills | Use for UI hierarchy, truthful content, operational controls, empty/loading/error states, keyboard use, contrast and responsive review. Case B triggers concrete R-17/R-26/R-27/R-38 and C-2/C-5 defects. | Visual rules cannot choose equations or establish hazard validity. Marketing/pricing/testimonial examples are irrelevant to this academic workspace and should not cause extra product sections. The core is a filter, not brand direction. Apply the user's recorded DURING mode without asking again. |
| `skills/abo-numerical-modeling/SKILL.md` | Newly authored for ABO | Route scientific equation, geographic, deposition, grain, threshold and replication work here. Case A shows that explicit units, wind convention, projection and broadcasting rules detect real errors. | Requires later cited scientific sources and empirical observations; it does not supply a validated formulation. NumPy/pyproj links cover mechanics, not volcanic physics. |
| `skills/abo-python-react/SKILL.md` | Newly authored for ABO | Route local API, validation, generated contracts, dependency workflow and React integration here. Case B is rejected because invented results bypass the data/computation path and independently handwritten response types can drift. | FastAPI, uv and Vite choices are engineering decisions. Avoid using this skill to select physical parameters or expanding the scope into cloud/authentication services. |
| `skills/abo-qa/SKILL.md` | Newly authored for ABO | Route setup/skill/numerical/workflow validation here. It requires observed artifacts, both connection success/failure, scientific invariants and explicit confidence limits. This report follows that evidence distinction. | A checklist alone is not independent proof. Real command output, user-flow exercises and independent numerical expectations are still required. |

The locally copied anti-slop core and UI skill are byte-identical to their installed sources by SHA-256: core `F17E14D59BBCC255CCF7AC0E7BB96099A03658E05A2AB566EA535568F189A390`; UI `3CA13EA8C32493FC55423A4947C9392243BD6A68C88BA61BA280B4A6745EDAC1`. These hashes establish copy fidelity, not the universal quality of the filter.

One copied-rule quality caveat is material to later accessibility review: anti-slop R-25 labels large text as `18px+`, which is too permissive for normal-weight text. Use the authoritative threshold of 18pt regular (24 CSS px) or 14pt bold (about 18.67 CSS px) before allowing the 3:1 large-text ratio; otherwise require 4.5:1. [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). The exact copied files are retained for provenance. Current starter colors all exceed 4.5:1, so this caveat causes no observed starter defect. It demonstrates why a useful visual filter still needs standards verification rather than blanket endorsement.

Bundled validation command, run separately for each authored skill directory:

```powershell
python C:\Users\Daniel\.codex\skills\.system\skill-creator\scripts\quick_validate.py skills/abo-numerical-modeling
python C:\Users\Daniel\.codex\skills\.system\skill-creator\scripts\quick_validate.py skills/abo-python-react
python C:\Users\Daniel\.codex\skills\.system\skill-creator\scripts\quick_validate.py skills/abo-qa
```

All three returned success. This checks frontmatter, naming and unfinished placeholders; it does not prove routing, scientific correctness, instructions being followed, or usefulness in future work. Only the ABO skills were authored here; copied anti-slop is assessed separately. Other installed skills are untested and unnecessary to claim as part of the ABO bundle.

## Case A: proposed ashfall calculation and airport interpretation

Candidate supplied for review:

```python
x, y = np.meshgrid(longitude_degrees, latitude_degrees)
transport = (np.sin(np.deg2rad(wind_from_deg)), np.cos(np.deg2rad(wind_from_deg)))
deposit = np.vectorize(per_cell_gaussian)(x, y) * eruption_duration_s
thickness_mm = load_kg_m2 / bulk_density_kg_m3
```

**Decision: reject the claim that this is a reviewable vectorized deposited-ash model, and reject interpreting an airport inside its contour as unsafe airspace.** The numerical-modeling and QA skills give actionable reasons:

| Finding | Why it changes the result | Required correction/evidence |
| --- | --- | --- |
| Geographic degrees used directly for the mesh | A meter-based Gaussian cannot use degree distances consistently; easting/northing and wind alignment need a declared coordinate frame. | Transform geographic inputs into a documented local metric CRS with explicit axis ordering; verify known offsets and round trips. A degree-space mesh is acceptable for display only if calculation occurs in a correct separate frame. |
| Meteorological wind-from vector points the wrong way | With east/north components, a wind FROM north must transport south; the candidate transports north. Every cardinal direction is reversed. | Use explicit opposite transport components and cardinal-direction expectations. Preserve the FROM convention in input labels and presets. |
| `np.vectorize` wraps scalar evaluation | The proposal excludes Python cell iteration. NumPy documents this convenience wrapper as essentially a loop; returning an array does not meet the kernel objective. | Use array expressions, broadcasting over a documented grain axis, then axis reduction. Review shapes and memory, not only syntax. [NumPy vectorize](https://numpy.org/doc/stable/reference/generated/numpy.vectorize.html), [broadcasting](https://numpy.org/doc/stable/user/basics.broadcasting.html). |
| Multiplication by duration is scientifically ambiguous | `per_cell_gaussian` has no equation or output units. Concentration in kg/m3 times seconds yields kg s/m3, not deposited load in kg/m2. If the function already returns deposition flux in kg/m2/s, duration integration may be dimensionally valid under the stated steady assumption. | Provide the cited formulation, dimensional derivation, settling/deposition treatment, emission normalization and boundary assumptions before judging it. Do not infer deposition solely from the function name. |
| Thickness label is off by a factor of 1000 | Load in kg/m2 divided by bulk density in kg/m3 gives meters. | Convert once at the named boundary: `thickness_mm = 1000 * load_kg_m2 / bulk_density_kg_m3`, with positive source-backed bulk density. |
| Airport-contour intersection overstates aviation evidence | A surface deposit field has no time/altitude-resolved airborne concentration or operational flight criteria. | Describe airport intersection as ground-footprint screening. A flight-safety conclusion needs separately justified airborne modeling and criteria; this setup cannot provide it. |

An evaluator-run Python arithmetic check used four cardinal bearings. For FROM bearings 0/90/180/270 degrees, the candidate produced east/north vectors `(0,1)`, `(1,0)`, `(0,-1)`, `(-1,0)`; the expected transport directions are their opposites. A clearly synthetic dimensional check with load 1 kg/m2 and bulk density 1000 kg/m3 yielded 0.001 m, equal to 1 mm. These calculations demonstrate the orientation and conversion errors; they are not eruption parameters or model tests.

Remaining blockers include the actual grain-class implementation, near-vent/upwind treatment, zero-mass behavior, finite/nonnegative outputs, finite-domain mass accounting, grid convergence and bounded resources. The candidate fragment is insufficient to resolve these. The required grain behavior cannot be assumed to exist inside an unspecified scalar function.

## Case B: fabricated API result, duplicate response schema and dead control

**Decision: reject returning `{'thicknessMm': 20, 'populationExposed': 50000}` as a simulation result while manual data and a scientific kernel are absent.** These may be explicitly labeled synthetic unit-test fixtures outside production datasets, but should not appear as real computed outputs in the foundation. Missing science needs a truthful not-implemented/empty explanation, not plausible numbers.

Python should own validated API contracts; derive React types from the application's actual OpenAPI schema. Review generated types together with backend validators, response behavior, runtime response validation, consumers and tests. Generating types reduces contract drift but cannot by itself validate a runtime response. A differently handwritten React shape is a concrete cross-boundary defect to correct.

A button labeled `Run simulation` with no request handler fails anti-slop R-26/C-2. Remove it or visibly defer the feature; a real simulation action should only be enabled after a computation/data path exists. The foundation can offer `Check Python connection` backed by the health endpoint. Verify loading, success, malformed response, connection failure, retry and obsolete-request cancellation for that actual action. Do not relabel a health check as simulation.

The copied UI filter is useful here because its function/honesty gates identify fabricated counts and the inert button. The ABO application skill supplies the architectural correction. The numerical skill supplies the manual-data boundary. The QA skill prevents passing a pretty screenshot or a health response as simulator proof.

## Case C: acceptable later evidence

### January 2020 Taal replication

1. Manually curate and review a source registry with exact publication/table/page, URL/DOI, observation dates/times, units, coordinate definitions, transcription notes and uncertainty. Separate eruption parameters, winds, grain classes/density, observed deposits, affected-area reports and population references. This report did not research the historical event; the proposal's historical description remains an unverified source claim.
2. Freeze the chosen equation, assumptions, versions, input snapshot, metric CRS, grid definition and run settings. Explain how a steady uniform-wind approximation relates to the historical observation period and what it cannot reproduce.
3. Predeclare comparisons appropriate to the reference. Point thickness measurements can support residual/error summaries with units; sourced polygons can support declared overlap metrics; categorical affected-location reports support limited footprint/coverage comparison. Absence of a report is not observed zero ash. Do not convert province names alone into quantitative thickness truth.
4. Separate calibration observations from withheld evaluation observations, or disclose that no independent evaluation set exists. Choose thresholds/tolerances from source uncertainty and intended academic purpose before reviewing model output. Matching observations used to tune parameters demonstrates a fit, not independent predictive accuracy.
5. Include mass-budget and dimensional checks, cardinal-wind tests, zero-mass/upwind/vent/edge behavior, class normalization, resolution sensitivity, parameter sensitivity, runtime and memory bounds. Report finite-domain loss separately from conservation failure.
6. Trace sourced inputs through the numerical kernel, municipality sampling, exposure criteria and actual contour/table output. Mark out-of-domain municipalities as unknown, disclose centroid sampling, use unique municipality IDs and source-year populations, and explain overlapping hazard counts.

Acceptable evidence is a reproducible run plus independent observations, comparison metrics and declared tolerances with disclosed limits. A plausible contour, general province resemblance, successful install, January preset label, or airport intersection cannot establish historical replication or flight safety. This setup cannot prove future-eruption predictive validity, municipality-wide or individual exposure, building-level structural safety, airborne safety, PHIVOLCS approval, or operational readiness.

### Proving a skill useful

Use realistic artifacts and prompts with a known review rubric. Give the evaluator the case without author-supplied expected defects; record which skill was routed, actual decisions/findings, false positives, missed defects and proposed correction. Compare a skill-assisted review against an unassisted review where feasible, and test a valid counterexample so the skill does not merely reject everything. Re-run on additional unseen cases and verify that recommendations improve the affected artifact without scope creep.

Cases A and B show concrete fit between this bundle and supplied defects. They are not a blinded or causal evaluation: the cases and their intent were supplied in the assignment, and the evaluator already saw the authored instructions. Bundled YAML validation proves packaging only. A later controlled test can provide stronger usefulness evidence; scientific correctness still depends on independent equations, data and tests rather than the skill's name.

## Foundation validation record

Environment observed independently: Windows PowerShell, uv 0.11.7, project Python 3.12.13, Node 25.9.0, npm 11.19.0. CI declares Python 3.12 and Node 22; the evaluator did not execute that Linux/Node-22 workflow. The Python project requires Python 3.12, so the host's unrelated global interpreter is not used for backend gates.

| Artifact/check | Independent result | Evidence limit |
| --- | --- | --- |
| `backend/`: `uv sync --locked` | PASS; 35 packages resolved, 33 installed packages checked | Reproduced the locked existing local environment; not a new operating-system matrix. |
| `backend/`: `uv run ruff check . ../scripts` | PASS | Static source lint. |
| `backend/`: `uv run ruff format --check . ../scripts` | PASS; 4 files formatted | Formatting only. |
| `backend/`: `uv run pytest` | PASS; 2 tests | Actual health JSON contract and OpenAPI operation/schema; no numerical tests or simulation proof. |
| `frontend/`: `npm ci` | PASS after the project Vite session was stopped; 263 packages installed | First attempt while Vite ran failed with Windows EPERM on the loaded native Rolldown module. No forced delete or unrelated process termination was used. npm reported 0 known audit vulnerabilities, which is not a security audit of the application. |
| `frontend/`: `npm run api:types` | PASS; exports actual FastAPI schema, openapi-typescript 7.13.0 generates the TypeScript file | Generation does not itself validate runtime responses. Before/after hashes of both generated files and both lockfiles were unchanged. |
| Saved schema vs live `/api/openapi.json` | PASS; semantically equal and only `/api/health` exposed | Shows the generated file describes the currently running health API. |
| `frontend/`: `npm run check` | PASS; ESLint, TypeScript, Vitest 4.1.11 (3 tests), production build | Client tests cover expected response/cancellation forwarding, HTTP 503 rejection and malformed model-status rejection using mocked fetch. They are not browser workflow tests. |
| Vite production build | PASS; 17 modules, generated HTML/CSS/JS | Bundle generation only; neither production hosting nor simulator behavior. |
| Direct `http://127.0.0.1:8000/api/health` | PASS, HTTP 200 | Returned `status=ok`, `service=ABO`, `version=0.1.0`, `model_status=not_implemented`. |
| Proxied `http://127.0.0.1:5173/api/health` | PASS, HTTP 200, same JSON | Observed before the temporary Vite stop and again after browser outage recovery; proves the actual Vite-to-Python HTTP path. |
| `http://127.0.0.1:5173/` | PASS, HTTP 200, React entry module present | HTML delivery only; rendered browser behavior is separate. |
| `.github/workflows/ci.yml` | PASS static parity with local locked install, lint/format/tests, contract regeneration/drift and frontend checks | GitHub execution unverified. `git remote -v` returned no remote; no deployment configured. |
| Repository instructions/map | PASS path/routing review | Local instructions route future work; they do not automatically prove compliance in future agent sessions. |

The first frontend install exposed a real setup issue: npm needs to replace the native `.node` module that a running Vite process holds open on Windows. The implementing agent stopped only its project Vite session, then the evaluator reran the locked install and all frontend gates successfully before allowing restart. The implementing agent added the recommended Windows note to `docs/DEVELOPMENT.md`; independent reread confirmed it directs the user to stop this project's Vite process before repeating `npm ci`, then restart after checks. No elevated privileges or destructive manual cleanup were required.

Dependency inspection found and resolved a mismatch in the advertised minimum: `frontend/package.json` and documentation initially allowed Node 22.12, while locked ESLint 10.12.0 and nine related packages require `^20.19.0 || ^22.13.0 || >=24`. The evaluator tested every package-lock `engines.node` constraint with installed semver; ten dependency packages rejected 22.12.0. The implementing agent changed the project/lock root range to `^22.13.0 || >=24.0.0`, added `frontend/.npmrc` with `engine-strict=true`, and aligned architecture/development guidance. Independent verification confirmed matching manifest/lock ranges, strict engine checking, all locked constraints accepting 22.13.0/24.0.0/25.9.0, and project rejection of 22.12/23. All 263 installed package versions still match the final lock, so previous local gate results apply to the same dependency versions. This verifies compatibility metadata rather than actual runs on every advertised Node version.

Regeneration evidence, SHA-256 before and after the `api:types` run:

- `frontend/openapi.json`: `023D291C07FA783A94FD489105365A7395D0A6ADACE4EBA500C031D75831FAD5`.
- `frontend/src/api/schema.d.ts`: `3BAE77FAA5E3879A19B877E8519AAD96353DE4B60A2A72AD5973DADD3573F0B3`.
- `backend/uv.lock`: `DE3792D044DB39927818123373A5064ECBCEB68DB1285E1F58C2CD7ABB1D06B9`.
- `frontend/package-lock.json`: `2719196039F26F5EAD1BC2C8A52BF700884480A3150ED9A8A1729AE2FBDF48BE`.

The subsequent Node-engine metadata correction changed `frontend/package-lock.json` to `06CBC32B7BDF5BB54B32DE4A4DFB3FD1234FB8AE051817AED8714FA225CA912D`. This expected metadata change is distinguished from API generation drift; installed dependency versions remain consistent as checked above.

### Source and draft UI review

Python owns `HealthResponse`, with literal service/model status and forbidden extra fields. React imports its type from generated schema and validates an unknown JSON response before accepting it. The health client uses relative `/api/health`; Vite binds to 127.0.0.1 with strict port and proxies `/api` to the local backend. The application implements idle/loading/connected/error states, abort/timeout handling, a real retry action and a theme toggle. No simulation endpoint, hazard-result defaults, map contours, fabricated populations or scientific datasets exist.

`DESIGN.md` distinguishes temporary starter choices from owner-authored branding. `App.tsx` visibly says `draft without direction`, `Simulation is not implemented`, and that the outputs are academic rather than a PHIVOLCS advisory. The default ENERGY/RHYTHM/MOTION values are recorded as 1/1/1. This is an honest technical draft; it is not final simulator design or a shippable scientific result. The existing proposal link is real source identity; the evaluator has not tested its remote click/authorization in the browser.

An independent arithmetic check of the actual source CSS tokens yielded text/background contrast ratios: light main text 12.97:1, secondary text 7.10:1, link 6.14:1, filled button 6.82:1; dark main text 14.52:1, secondary text 10.15:1, link 10.71:1, filled button 10.71:1. All exceed 4.5:1. This independently verifies the declared solid-color pairs. The implementing agent additionally reports that computed browser colors matched those tokens in both themes. CSS declares 44px minimum button/link targets, visible focus styles and a narrow-screen footer layout; applicable rendered checks are recorded separately below.

### Browser evidence

The following evidence was supplied by the implementing agent, which directly used CUA on the running app. This independent evaluator did not operate that browser or separately inspect its screenshots. Its own source, unit-test, HTTP and color-token evidence is distinguished above.

| Primary-reported browser check | Reported observation | Scope |
| --- | --- | --- |
| Initial/empty state | Visible Python connection not checked; scientific implementation status visibly absent | Honest starter state, no fabricated simulation results. |
| Keyboard connection action | Enter triggered a request and displayed real ABO API version 0.1.0 | Actual browser-to-Python success. |
| Loading/failure | Stopping only the project's Python process showed the loading text with disabled checking button, then handled HTTP 502 feedback instructing backend restart | Real backend outage, not only a fetch mock. |
| Restart/retry | After restarting the project's Python process, Enter retry returned the connected state | Actual recovery; independent later direct/proxy HTTP checks also returned 200. |
| Keyboard focus/order | Tab from connection button reached the proposal link, then the theme button; each showed computed solid outline | Small starter's keyboard navigation. No dialogs exist to test Escape. |
| Themes | Space and Enter operated dark/light toggle; computed browser palette matched CSS tokens | Both shipped starter themes. |
| Narrow viewport | At 320 by 760, scroll width 305px was within viewport 320px; buttons were approximately 45.2px high and proposal link 44px; full-page screenshot visually inspected | One narrow viewport and inspected rendering, not every possible device/breakpoint. |
| Desktop viewport | At 1280 by 900, scroll width equaled 1280px; main width 800px; full-page dark screenshot visually inspected | One desktop viewport. |
| Console | Error/warn query was empty before the outage and after completed recovery; intentional outage was visible through handled UI feedback | No unexpected console error reported in those inspected states. |
| Proposal link | Actual href matches the connector-read proposal source | No browser-authentication or remote document interaction test claimed. |

The eight-second timeout branch was reviewed in source and not deliberately waited out in the browser. The primary reset its viewport override and left the preview open; both local servers remain running. These checks support the implemented health starter, keyboard/theme/state behavior and the applicable anti-slop honesty/function/resilience rules. They do not establish final visual identity, every browser/viewport state, a complete anti-slop simulator-design gate, any scientific kernel, or any historical replication.

## Remaining work and final assessment

The prepared foundation is reviewable and its observed checks pass. The dependency minimum mismatch and Windows reinstall guidance were corrected during QA. No unresolved implementation defect was found within the tested health-only scope. Stage 1 still needs the source registry, cited deposition specification and manually reviewed inputs; later numerical, exposure, mapping, threshold, aviation-screening, replication and sweep features remain unimplemented. Final simulator design direction is also pending. The authored skills and copied anti-slop filter are useful on the specific reviewed cases, with broader effectiveness and scientific accuracy unproven.
