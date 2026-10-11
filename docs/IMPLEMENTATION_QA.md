# Independent implementation QA

Evaluator: independent QA subagent. Date: 2026-10-09 (Asia/Manila).

Recovery verification: 2026-10-10 (Asia/Manila). The original implementation
evidence below is retained; this dated addendum records the recovered agents and
current artifacts without reclassifying illustrative inputs as reviewed science.

## Recovery verification — 2026-10-10

### Comprehensive geography and presentation pass — 2026-10-10

The user requested a revised geographic 3D presentation, an adjacent impact map,
progressive disclosure, custom selectors and scrollbars. Independent QA reported
that the existing kilometre-sized receptor spheres could resemble airborne
particles beside the small landmark, and requested clearly differentiated ground
points, location/scale cues, and vertically stacked paired views on narrow screens.
An adjacent thickness map must not imply reviewed damage categories: those criteria
remain unavailable.

The scene owner corrected the class replay to use one elapsed physical clock and
the backend's separate class falling times. `node qa/presentation_audit.mjs`
independently passed nine synthetic assertions against the actual TypeScript
helper: common-time horizontal movement for unsettled classes, distinct vertical
descent, faster-class landing, late-time clamping, negative time, coordinate order,
and interpolation of supplied samples. This is presentation arithmetic evidence,
not browser animation or atmospheric-model validation.

The final static display assets were independently checked with
`qa/audit_terrain.py`: **17 cached-source hashes and four output hashes match**.
Fifteen asymmetric scalar HGT samples were independently bilinearly interpolated
after inverse projection. Maximum discrepancy is **0.0493804 m**, within stored
0.1 m rounding. The independent script does not import the curation implementation.
The asset author's offline `curate_terrain.py --check` also passes.
The independent raw-source audit requires the optional curation cache: HGT and
large vector snapshots are Git-ignored. Its failure message gives the explicit
recreation command on a fresh checkout. Packaged-asset `--check` and normal app
operation do not require the raw cache.

The orchestrator's browser review identified an undersized Natural Earth Lake
Taal polygon. The backend owner replaced it with cached OpenStreetMap relation
270582, version 46, timestamp 2026-08-30T11:43:17Z. Independent reconstruction from
the source XML confirms **seven native island holes**, **235.971945 km²** projected
water area, and zero geometric symmetric difference with the packaged map lake.
All **3,775 source-water raster locations** exactly match mask 2 and the declared
historical 3 m display surface. The 250 m raster water area is 235.9375 km². The
Taal center is in an island hole (land mask 1); a 5 m historical DEM sample does
not establish a present crater lake or water level. OSM's elevation tag is 2 m;
the retained 3 m historical display assumption and source discrepancy are disclosed.

Source inspection confirms east/north metres map to `(E/1000, ASL/1000, -N/1000)`.
The model paths and column receive one uniform submitted-vent-elevation offset;
they are not bent or stopped by terrain. The reference/DEM center differences
are 311/5 m at Taal, 2462/2340.2 m at Mayon and 2422/2420.5 m at Kanlaon. A dashed
connector and explanatory guide disclose the mismatch. Display terrain is 100 km
wide, while the teaching solver domain is 200 km. The optional detached final
deposit layer is initially hidden and explicitly labeled as a floating display
plane. No terrain collision, runoff, rainfall, ash-water chemistry or damage
physics has been introduced. Terrain failure/origin mismatch leaves simulation
results available and uses a visibly labeled schematic fallback.

Independent source review found a custom-selector viewport defect: a low trigger
could open downward with the larger upward space as its maximum height. The
orchestrator corrected placement to use the chosen side and added a regression.
`node qa/select_audit.cjs` now passes against the actual component in jsdom:
Space, disabled-first skipping, wraparound, Enter commitment, trigger focus,
repeated-letter typeahead, Escape, outside dismissal, and a 123-item menu bounded
inside a 320 px viewport. Source also implements Home/End and Tab dismissal.
These are DOM/control checks, not touch, screen-reader or actual browser layout
certification.

The paired views consume the same completed result/selection. The map inspector
shows Python point thickness/load, reporting coverage and unknown roof/crop
criteria. Selecting a location is available through the keyboard-accessible
selector, even while the full table is collapsed. The table/exports are disclosed
only in the spatial workflow. CSS stacks paired views below 1200 px and keeps
the controls, table, menu and page scrollbars themed. Actual final responsive
browser evidence is attributed to the orchestrator separately below.

Latest independent Python verification from the documented **backend working
directory** passes **58 tests** (27 backend-owner tests and 31 independent cases),
Ruff lint and all **16 Python files** formatted. The initially introduced QA script
was corrected to the project's 100-column Ruff configuration. Population audit
again passes all 121 PSGC/population pairs and centroids, with unchanged inventory
limits. Independently reran final frontend ESLint, TypeScript and Vitest:
**32 tests pass across nine files**. No build/dist files were changed by this
evaluator. Earlier 56-test/18-frontend-test recovery evidence below is retained as
a dated earlier-build snapshot.

Fresh independent listening-server requests after final catalog regeneration
returned three 200×200 teaching results, with 51/19/41 covered receptors and
36,000,000 kg emitted mass each. The retained fraction remains
0.8460926745954033. All three statuses remain illustrative, seasonal numeric winds
are null, criteria are empty, and historical evaluation returns unavailable.
The corrected study title and 2022-03-02 publication date are present in the
actual HTTP catalog response.

### Final geographic browser evidence — attributed to orchestrator

The orchestrator operated CUA/in-app browser and supplied the following final
workflow evidence. This evaluator inspected the saved Taal desktop and dark
mobile location-menu images, confirming the depicted paired layout, visible
source credits and contained dropdown. The evaluator did not independently
operate this renderer or measure its frame rate/viewport geometry.

- All three actual DEM views and adjacent offline maps rendered at 1440×900;
  reported document width was 1430 px, with no horizontal overflow. Final Taal
  showed the OSM lake/native island holes and credits. A no-store fetch correction
  addressed the in-app browser retaining old geographic assets after a rebuild.
- Taal replay measured recent windows of **42 and 45 fps**, compared with an
  earlier 60 fps window. These observations meet the 30 fps target on that
  recorded machine/session; they are not a constant-rate guarantee. Pressing
  Play after completed replay restarted its clock at zero; Pause worked.
- Shared Tanauan selection showed 0.16 mm, 0.16 kg/m² and population 209,697
  (2024). A manually increased Mayon rate of 100,000 kg/s produced Malilipot
  3.71 mm and one reported municipal centroid with indicative population 41,066.
  Damage criteria remained unknown; this manual example is not calibration.
- Regional camera/reset, map Deposit extent/reset, stale-input preservation,
  manual 10 m/s winds from225° versus45°, the 360-direction sweep and historical
  unavailable state were exercised against the running application.
- Both themes at 320×800 reported document width 310 px and stacked 278 px
  panels; inputs auto-collapsed after computation. The location selector's
  123 receptors plus placeholder fitted a 280 px menu at x16/y425.95, ending at
  y705.95 within the viewport, with a themed scrollbar.
- Browser inspection reported no application errors; the existing THREE.Clock
  deprecation warning remains. Primary photo captions/reference pages were
  verified by the orchestrator, not used as current-survey or photo-fidelity proof.

Artifacts: `qa/browser/geographic-taal-desktop.png`,
`geographic-mayon-desktop.png`, `geographic-kanlaon-desktop.png`,
`geographic-mayon-impact-dark.png`, `geographic-mobile-light.png`,
`geographic-mobile-dark.png`, `geographic-mobile-selector-dark.png`,
`geographic-mobile-map-selector-dark.png` and
`geographic-mobile-map-selector-light.png`.

Actual operating-system reduced-motion changes, actual WebGL context loss,
long-duration GPU resource stability and credentialed MapTiler operation remain
uncertified. Renderer-mocked regression evidence is retained separately. The
orchestrator's final history/copy cleanup passed `npm run check` (32 tests, lint,
types and build). Reloaded IAB entry `/assets/index-Y7ogS8-l.js` visibly showed
single wind availability labels, one historical reason and collapsed reference
tables. Generated OpenAPI/TypeScript contracts reproduced without drift, and the
final backend gate again passed all 58 cases. No new numerical or scientific
behavior is attributed to that cleanup. Final screenshots are
`qa/browser/final-geographic-workspace.png` and `final-in-app-geographic.png`;
temporary viewport overrides were reset to the user's normal browser size.

### Research, required values and computation matrix

| Area | Current evidence | Meaning and limit |
| --- | --- | --- |
| Volcano profile coordinates/elevations | Independently reopened primary GVP pages on 2026-10-10; all three match catalog | Published profile points, not surveyed event vents |
| Municipal populations and identifiers | 121 included pairs match independently read 2024 PSA provincial tables; 121 centroids recompute | Partial inventory; name-to-polygon jurisdiction crosswalk not independently certified |
| Airport positions | CAAP document references and DMS conversions retained; source references resolve | No fresh independent PDF-page reread in this pass; no airborne aviation inference |
| Teaching physical inputs | Catalog and INPUT_VALUES agree on H=5000 m, Q=10000 kg/s, T=3600 s, U=10 m/s from225°, K=500 m²/s, σ₀=250 m, density1000 kg/m³ and five assumed classes | All illustrative; sources for geography do not certify these physical assumptions |
| Required real event/weather values | Seasonal winds remain null; historical scenario/observations remain absent | Source-backed eruption, altitude/time-specific winds, grain speeds/fractions, diffusion and bulk density still needed |
| Computation equations and units | Normalized eventual-deposition Gaussian, exact cell integration, cardinal FROM conversion and mm conversion checked against code and 31 independent cases | Correctness for the declared reduced model; no historical accuracy claim |
| Mass and engineering defaults | QT=36 million kg; 200×200 km, 1 km cells, 16 layers; domain complement and memory limits tested | Numerical/engineering defaults, not applicability bounds |
| Screening | Reporting uses ≥0.5 mm; missing roof/crop criteria remain unknown; facilities use ground-footprint screening | No universal damage or potability criterion is invented |
| Historical references | Fresh publisher check confirms ASL plume datum, separate inferred above-vent height, three fitted deposit volumes and narrative area; missing held-out geometry remains explicit | Scalar areas cannot establish IoU; no calibrated replication exists |
| Display geography | Raw-HGT arithmetic, hashes and source OSM polygon/mask agreement pass independently | Historical DEM and mapped shoreline are presentation only, not current survey or added solver physics |

Primary GVP checks match [Taal](https://volcano.si.edu/volcano.cfm?vn=273070),
[Mayon](https://volcano.si.edu/volcano.cfm?vn=273030&vtab=Weekly) and
[Kanlaon](https://volcano.si.edu/volcano.cfm?vn=272020). The Mayon base URL failed
in the research tool; its Weekly page returned the same profile fields.

The [publisher's Taal article](https://link.springer.com/article/10.1007/s00445-022-01534-y)
confirms 17–21 km ASL, the separate 17.8 km above-vent inference, fitted volumes
0.057/0.042/0.090 km³, and narrative 8605 km². Subtracting the 311 m profile datum
gives 16,689–20,689 m. Its title/date metadata was corrected by the orchestrator.
The fresh browser extractor did not expose Table 3; the retained 3864.89 km²
transcription and discrepancy remain attributed to the earlier source review,
not a newly resolved agreement. No missing wind or mass was inferred from these
publication facts.

### Earlier recovery snapshot

Independently reran `uv run pytest tests ../qa/test_independent.py -q`: **56 tests
passed**, comprising the backend author's current tests plus this evaluator's 31
independent cases. Ruff passed for backend, scripts and QA; all 13 checked Python
files were formatted. `qa/audit_data.py` again verified all 121 population/code
pairs, all selected centroid calculations, unique identifiers, source references,
and the three archived hashes. These reused the previously independently read PSA
source facts; the websites were not re-fetched during this recovery pass.

Independently reran frontend ESLint, TypeScript, and Vitest: **18 tests passed in
six files**, including the stopped-server recovery message and scientific-view
failure containment regression. The test runner emitted a Three.js CommonJS
deprecation warning; no test failed. Production build/locked installation evidence
is owned and recorded by the orchestrator, not inferred from these tests.

Independently exercised the actual listening server at `http://127.0.0.1:8000`:
health, real catalog, all three simulations, sweep, historical status, the built
workspace, and all three required documentation URLs returned **HTTP 200**.
The real catalog remained revision `2026-10-09-curation-1` with 123 receptors.
Taal/Mayon/Kanlaon completed with server timings 46.9/25.0/21.3 ms in this run,
51/19/41 covered receptors, and two generated contours each. Total mass was
36,000,000 kg; inside-domain mass 30,459,336.285434518 kg; outside-domain mass
5,540,663.714565482 kg; retained fraction 0.8460926745954033. Sweep returned 123
receptor records. Historical status correctly remained unavailable with two
reference tables. This is direct HTTP and computational evidence, not historical
accuracy.

### Recovery source-impact review

`ScientificViewBoundary` now wraps the lazy scientific view/Suspense while
workspace controls, state and the completed result table remain outside the
boundary. A failed lazy import or renderer therefore presents an actionable view
failure instead of removing the entire workspace. Its key follows the view, so
switching views resets containment. The added regression exercises a thrown child
and confirms both controls and the completed table remain mounted. It does not
simulate every browser chunk-cache condition.

The API client now distinguishes unavailable local HTTP service from malformed
JSON and field validation. Its network message names `scripts/start.ps1` and
retry. Aborted requests retain cancellation handling; fetch failure does not
clear completed results, and subsequent successful computation replaces them.
No backend schema or scientific equation changed in these recovery fixes.

The final scene source adds a categorical grain-class legend using the submitted
diameters, settling speeds and Python path fall times. A WebGL context-loss
listener prevents the default event, pauses replay and switches to the usable
fallback. Listener replacement/unmount cleanup and hidden-tab/reduced-motion
pause are covered by the scene's five focused tests. These tests mock the Canvas
renderer boundary: they establish lifecycle/control behavior, not actual GPU
resource reclamation or an operating-system preference change in Chrome.

The backend owner also corrected a Windows path-normalization defect that let
unknown API paths fall through to the SPA. Independent regression run increased
the Python total to 56. Direct listening-server requests now return 404 for both
`/api` and `/api/missing`, while a non-API extensionless route (`/foo`) still
returns the application HTML and computation documentation returns Markdown.

### Attributed Chrome evidence from the orchestrator

The following was reported by the orchestrator from actual Chrome interaction,
not independently operated or instrumented by this QA subagent:

- 3D replay measured **59 rendered fps**, with a separate native
  requestAnimationFrame check at **59 callbacks/second** on the existing
  Ryzen 7 5800U development machine. This meets the 30 fps target for that observed
  case, not an operating-system/GPU/browser performance guarantee.
- Stopping the local server and pressing Run displayed a network error while the
  completed Taal result and selected Tanauan record (0.16 mm; population 209,697)
  remained visible. Restarting the server and running again recovered, reporting
  approximately 43 ms in Python. The clearer startup/retry wording was then added
  and its regression passed in this evaluator's 18-test frontend run.

Reviewed physical scenarios, seasonal plume winds, impact criteria, water
facilities, 2020 historical populations, and held-out Taal observations remain
outstanding scientific-data gates. None of the recovery passes certifies those
missing inputs or establishes historical agreement.

## Scope and evidence rules

This evaluator owns only this report and `qa/`. Implementation owners retain backend,
frontend, data, and other documentation. Numerical correctness, data review,
historical agreement, browser behavior, and rendering performance are separate
claims. Synthetic fixtures establish analytical behavior, not volcanic accuracy.

## Scientific specification gate

The proposed normalized two-dimensional Gaussian is dimensionally consistent for
eventual ground deposition under flat ground, constant settling speeds, uniform
horizontal wind, and a mass-conserving release distribution. Mass rate times
duration is kg; the normalized horizontal density is 1/m²; their product is kg/m².
Division by bulk density gives metres, followed by an explicit factor of 1000 for
millimetres. Equal release-layer weights and grain fractions must each sum to one.

Exact integration over cell edges avoids falsely creating mass when a narrow
Gaussian is sampled at cell centres. A finite map can legitimately retain much
less than total mass. Receptor point loads are not cell-average loads. Wind FROM
north transports south; FROM east transports west. Calm wind is valid in this
formulation because there is no division by wind speed.

**Gate decision:** equations are implementable and reviewable. This is not a pass
for real input datasets or historical replication. Actual implementation tests are
pending below.

Required uncertainty controls: distinguish reviewed geography from assumed
diffusivity/initial spread/density/class parameters; missing impact criteria remain
unknown; seasonal surface wind is not automatically plume-height wind; an airport
ground footprint does not establish airborne safety; a water-facility footprint
does not establish contamination. Historical comparison requires measured or
digitized observations, uncertainty, and disclosed calibration/evaluation reuse.

## Additional skill cases

These evaluator-authored cases were not supplied as expected findings by the
implementation author. They are small decision checks, not a blinded causal
benchmark of the skill bundle.

| Case | Independent decision | Skill usefulness and limit |
| --- | --- | --- |
| Valid calm wind, positive initial spread, normalized grains | Accept; symmetric eventual ground deposition is defined | Numerical skill's “where formulation requires” qualifier prevents an unjustified positive-wind requirement. |
| Small map retaining only a fraction of emitted mass | Accept reported domain loss; reject renormalizing the map to the entire eruption | Conservation/domain guidance identifies a mass-accounting defect without rejecting legitimate boundary loss. |
| Out-of-domain centroid reported as zero and safe | Reject; mark unknown coverage and exclude from covered population totals | Numerical and QA skills give a concrete receptor/count correction. |
| A 0.5 mm contour reported as a roof-collapse threshold | Reject unless separately justified for a stated roof category | Units/source/scope guidance distinguishes reporting footprint from structural assessment. |
| Explicitly labeled synthetic educational example | Accept as numerical demonstration, not reviewed eruption or historical evidence | Honesty checks support demonstration; local manual-input policy must preserve the distinction. |
| Basemap API used only for presentation after explicit user approval | Accept; no live scientific ingestion is introduced | Earlier “avoid remote tiles unless later scope needs them” guidance is conditional, not a veto on approved scope. |
| Source-backed display DEM with a preserved flat-ground solver | Accept with datum/coverage/source disclosure; reject treating visual topography as computed interception | The numerical boundary prevents a false scientific claim without rejecting the user's requested geography. |
| Custom listbox near the bottom of a narrow viewport | Require bounded placement and keyboard access; found real chosen-side height defect and verified correction | UI/QA workflow produced a concrete usability finding; source/DOM tests do not replace browser or assistive-technology checks. |
| Different grain paths animated with one normalized duration | Reject because it hides different settling times; accept common physical clock and class-specific clamping | Numerical interpretation and presentation review caught a meaningful scientific explanation issue; nine independent helper assertions pass. |

## Implementation evidence

### Independent numerical/API checks

Commands run from `backend/`:

```powershell
uv run ruff check ../qa
uv run ruff format --check ../qa
uv run pytest ../qa/test_independent.py -q
```

**PASS: 31 independent cases, 2.72 s.** Lint and formatting also pass. Test
requests traverse the actual FastAPI route, service, and computational kernel.
Only the local catalog loader is replaced with an explicitly synthetic empty
registry, and a synthetic criterion is injected to test reviewed-criterion
comparison. No solver function is mocked. Expectations use scalar `math.erf` and
normalization arithmetic rather than importing implementation calculations.

Covered cases: scalar vent load/thickness; every cell's integrated mass; finite
domain retained/lost mass; four cardinal wind bearings and backend path endpoints;
zero mass; resolution-independent total integrated mass; unreviewed versus
locally reviewed criterion and inclusive equality; outside-domain unknown values;
six ordinary invalid inputs plus extreme finite inputs; duplicate identifiers;
invalid fractions; near-zero settling; a single-cell domain; calm-wind sweep tie;
and an AST check prohibiting Python loops/comprehensions and `np.vectorize` in the
computational module. Additional cases cover multi-grain/16-layer sums against
scalar arithmetic, facility/population coverage, maximum-sweep reproducibility,
large-allocation rejection, raw JSON NaN/Infinity handling, caller review claims,
and a synthetic held-out historical metric path excluding calibration readings.

This proves the tested reduced-model numerical behavior, not historical predictive
accuracy or the complete browser workflow. Real catalog checks are recorded next;
browser and rendering-performance evidence remains pending.

### Real catalog and source crosschecks

`data/catalog.json`, revision `2026-10-09-curation-1`, contains 121 municipality
records and two airport reference points. All 123 identifiers are unique; source
references resolve. All municipality populations have the explicit 2024 year.
Airports have null population rather than invented residents.

The evaluator independently reopened the five official PSA province pages and
compared every included PSGC/population pair against their 2024 POPCEN tables:
**121 checked, zero mismatches**. Reference facts are retained in
`qa/primary_population.json`, and `qa/audit_data.py` reproduces the local check.
Sources: [Batangas](https://psa.gov.ph/classification/psgc/citimuni/0401000000),
[Cavite](https://psa.gov.ph/classification/psgc/citimuni/0402100000),
[Albay](https://psa.gov.ph/classification/psgc/citimuni/0500500000),
[Negros Occidental](https://psa.gov.ph/classification/psgc/citimuni/1804500000),
[Negros Oriental](https://psa.gov.ph/classification/psgc/citimuni/1804600000).

All 121 selected polygon centroids were independently recomputed from the
archived geometry using EPSG:6933 equal-area coordinates and WGS84 output.
Maximum difference from rounded stored coordinates was 0.000000496322272 degrees,
within six-decimal rounding. Three source snapshot SHA-256 hashes match the
manifest. This verifies centroid arithmetic and snapshot integrity; the
name-to-polygon jurisdiction crosswalk is not independently certified.

Coverage is explicitly partial: Batangas 34, Cavite 16, Albay 18, Negros Occidental
29, Negros Oriental 24. The five official tables contain 131 units in total, while
the catalog includes 121; the excluded units are not represented as zero ash.
General Mariano Alvarez and Basay are recorded as unmatched transcriptions.
Source coordinates, population years, and coverage assumptions remain visible.

With **no catalog mocking**, the real FastAPI TestClient returned 200 for catalog,
all three illustrative simulations, the wind sweep, and historical status. Each
simulation returned 40,000 cells and two computed contour features; receptor
coverage was 51 for Taal, 19 for Mayon, and 41 for Kanlaon. Sweep returned all 123
records, marking outside-domain values unknown. Historical status correctly
returned unavailable with two reference tables and blockers. Health distinguishes
implemented solver from `not_historically_validated`.

These real-catalog runs used an in-process HTTP test client. A separate connection
attempt to localhost:8000 was refused before the orchestrator started the server;
no live-browser or listening-server success is inferred from TestClient results.

### Scientific data gate remains incomplete

All three physical presets are explicitly illustrative. Effective Amihan/Habagat
plume winds are unavailable; criteria are empty; no water facilities are supplied;
historical scenario/held-out observations are unavailable; 2020 populations are
not curated. This truthful runnable educational implementation does **not** meet
the plan's reviewed real-scenario, seasonal-data, impact-criteria, or historical
agreement gates. Published reference area tables are not digitized spatial
observations, and no historical fit is fabricated.

### Synthetic runtime measurement

`uv run python ../qa/benchmark.py` independently exercises the real API with a
synthetic 200×200-cell grid, three classes, and sixteen release layers. On
Windows 11 build 26300 / Python 3.12.13, the observed wall time was **0.747 s**,
server timing **561.5 ms**, traced Python/NumPy peak allocation **5,288,653 bytes**,
and serialized response **879,252 bytes**. Tracing itself adds runtime overhead.
The retained mass fraction was 0.9999999999999999. This one reproducible case is
not a performance guarantee, total operating-system RSS measurement, or a 3D/GPU
frame-rate measurement.

### Actionable findings during implementation

| Finding | Owner response / verification |
| --- | --- |
| Finite positive inputs could underflow variance or overflow settling/conversion, leading to NaN/Infinity | Backend added engineering lower bounds. Independent extreme-spread, density, and settling cases now return 422 and pass. |
| A valid 1×1 grid could crash ContourPy | Backend requires at least 2 cells. Independent single-cell request returns 422 and passes. |
| Raw JSON NaN/Infinity caused a 500 when FastAPI's validation error echoed the nonfinite input | Independently reproduced before correction. Backend sanitizes validation details; NaN and both infinities now return 422 in independent regression cases. |
| Caller-controlled `reviewed` metadata could claim input certification | Backend warns that caller status is asserted; criteria require exact match to reviewed local definitions and sources. Independent unknown-versus-reviewed cases pass. |
| Screen-fixed N/E caption becomes false after orbit | Source now uses world-axis compass arrows/labels. Rendered orientation awaits orchestrator browser evidence. |
| Trajectories rendered as disconnected pairs; enlarged landmarks could hide the source illustration | Source now uses a continuous THREE.Line and scales schematic profiles below release paths. Browser visibility awaits orchestrator evidence. |
| Selecting a map receptor recreated the map and reset its viewport | Source separates marker selection into a styling effect; selected ID no longer recreates the map. Browser viewport preservation remains to exercise. |
| Runtime API checks accepted missing consumed grid/path fields | Source now validates finite quantities, matrix dimensions, paths, contours, and consumed receptor fields before casting. Frontend author reports malformed-response tests; independently observed source correction. |
| Parallel seasonal requests conflicted with backend's one-computation semaphore | Source now awaits wind runs sequentially. Reviewed seasonal data remains unavailable; manual comparison is labeled separately. |
| Computation/input help links targeted absent routes | Source now links backend-served `/documentation/COMPUTATION.md` and `/documentation/INPUT_VALUES.md`; packaged serving still needs HTTP confirmation. |
| Light control borders and pale contour lines lacked contrast | Source darkens input borders and draws a dark contour halo. Configured color contrast checked below; complete visual accessibility remains separate. |
| Demand-render FPS could count paused time in first resumed frame | Source now resets the accumulator and measures `performance.now()` between active frames, skipping the first resumed interval. A frame-rate result still requires actual browser observation. |

### Frontend static evidence and contrast

The configured CSS text contrasts are 12.26:1 main / 6.26:1 secondary / 6.61:1
action in light mode, and 13.21:1 main / 9.03:1 secondary / 6.96:1 action in dark
mode. Input border contrast is 3.75:1 light / 3.54:1 dark; scene caption text is
10.78:1. These calculations use the actual configured colors and WCAG relative
luminance arithmetic. They do not establish a full rendered WCAG audit, browser
zoom behavior, map-label contrast, or keyboard flow.

Source inspection confirms completed-result sharing between views, stale-input
labels, hidden-tab scene unmounting, initially paused replay, reduced-motion
change handling, disposal of scene-owned textures/geometries/materials and orbit
controls, keyboard camera controls, viewport-independent receptor styling,
and map-service/offline fallbacks. Rendered correctness still requires browser
exercises and is not inferred from source alone.

## Findings and remaining limits

- Reviewed physical inputs, seasonal winds, impact criteria, water-facility data,
  2020 population references, and historical evaluation observations are pending.
- No existing health endpoint proves ashfall simulation.
- No screenshot or mocked frontend response proves numerical computation.
- Browser evidence supplied by the orchestrator will be explicitly attributed.
