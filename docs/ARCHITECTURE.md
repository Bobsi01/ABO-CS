# ABO architecture and stack

## Eruption extension, 2026-10-10

`eruption.py` adds `POST /api/eruption-sequences` using the same ash scenario and explicit illustration/lava options. Python produces finite-emission deposition frames, diagnostic mass accounting, native contours, receptor values, cloud parcels, fountain coordinates and optional raw-DEM lava coordinates/arrival times/actual-width footprints. The eventual `kernel.py` solver is unchanged. The sequence response has its own solver version; generated types and runtime validation cover the new boundary. Single-computation admission and a pre-allocation 512 MiB estimate still apply.

`Workspace.tsx` commits final ash and sequence only after both requests succeed, retaining previous completed results on failure. `EruptionTimeline.tsx` owns the presentation clock. `EruptionEffects.tsx` and `eruptionReplay.ts` interpolate Python positions and apply disclosed visual enlargement; no second solver exists. `GeographicMap.tsx` reads each native snapshot's contours/receptors and timed lava polygon. The eventual table/export stays separately labeled. Optional dated PDZ context comes from manually curated `eruptionResearch.ts`, with evidence/access limits in `ERUPTION_RESEARCH.md`. There are no runtime scientific feeds.

## Current implementation — 2026-10-09

`backend/src/abo_api/contracts.py` is the contract authority. `kernel.py` performs NumPy-only numerical work, `service.py` combines local catalog inputs, exposure, contours and historical metrics, and `main.py` validates/serves HTTP with a single-computation semaphore. No browser solver exists. Types in `frontend/src/api/schema.d.ts` are generated from the real Python OpenAPI schema.

`data/catalog.json` contains reviewed geographic/source transcriptions and distinctly illustrative physics presets. Source snapshots and hashes live in `data/source/`. Scientific values never arrive through runtime external services. `scripts/build_catalog.py` reproduces the explicit manual crosswalk. `scripts/curate_reference_assets.py` performs one-time published-file intake, not runtime weather collection.

React 19 + R3F 9 + Three.js provide WebGL2 3D; Leaflet presents computed contours and the offline coastline. MapTiler may provide a basemap only. `Workspace.tsx` manages submitted results and edited inputs; `components/VolcanoScene.tsx` renders backend trajectories and grid; `components/GeographicMap.tsx` presents the same receptor records. Rendering does not change the scientific outputs.

Routes: `GET /api/catalog`, `GET /api/health`, `POST /api/simulations`, `POST /api/wind-sweeps`, `POST /api/replications/taal-2020`. A built frontend is served by FastAPI at `/`; documentation is served at `/documentation/`. Unknown `/api/*` remains 404. Local startup binds to loopback.

The nominal grid has 200 centers per axis and 201 edges. Cells integrate the normal CDF exactly; receptor values evaluate the density analytically. The sweep broadcasts directions × grains × release layers × receptors, never 360 full grids. A conservative allocation estimate rejects requests beyond 512 MiB. Request limits, finite-input checks and one active computation bound resource use.

Historical evaluation accepts reviewed local held-out intervals and optional polygon geometry; unavailable inputs return a structured reason. Agreement is separate from solver availability. No historical validation is claimed by successful code tests.

## Archived foundation design

## Decisions for the foundation

| Concern | Choice | Reason |
| --- | --- | --- |
| Computation | Python 3.12, NumPy | Reproducible environment and native array broadcasting for an analytic mesh model |
| Geographic transforms | pyproj | Explicit local metric coordinates and axis order; no full GIS stack needed yet |
| Local backend | FastAPI, Pydantic, Uvicorn | Validated typed HTTP boundary and generated OpenAPI contracts |
| UI | React, TypeScript, Vite | Requested React stack with typed inputs and a small local development server |
| Package management | uv and npm, committed lockfiles | Reproducible install rather than a drifting requirements list |
| Quality gates | Ruff, pytest, ESLint, TypeScript, Vitest, Vite build | Focused source/contract checks on both sides |
| API types | openapi-typescript from exported FastAPI schema | One contract source rather than diverging handwritten types |
| Scientific data | Reviewed versioned local files | The proposal requires manual entry from published sources |
| Storage and deployment | Deferred | No persistence, accounts, or hosting requirement in this preparation request |
| Mapping library | Deferred until the kernel's output contract is settled | Avoid remote tiles and extra dependencies before a real contour field exists |

Runtime dependencies are pinned by `backend/uv.lock` and `frontend/package-lock.json`. Python 3.12 is the project target, separate from the host's existing Python installation. The complete frontend toolchain requires Node 22.13+ within 22.x, or Node 24+. Node 23 is excluded by locked dependencies. The observed host Node 25.9.0 is supported; Node 22 is the CI baseline. `frontend/.npmrc` enforces compatible engines during install.

Official references: [FastAPI first steps](https://fastapi.tiangolo.com/tutorial/first-steps/), [Vite environment requirements](https://vite.dev/guide/), [NumPy broadcasting](https://numpy.org/doc/stable/user/basics.broadcasting.html), [pyproj Transformer](https://pyproj4.github.io/pyproj/stable/api/transformer.html), [uv projects](https://docs.astral.sh/uv/guides/projects/).

## Data flow

```text
Manually transcribed published sources
  -> reviewed, versioned local input files
  -> Python validation and metric coordinate transforms (planned)
  -> vectorized deposition kernel (planned)
  -> municipality/criteria/screening evaluation (planned)
  -> FastAPI typed response (planned)
  -> React contour view and exposure table (planned)
```

The current implemented path is only `React -> Vite /api proxy -> FastAPI /api/health`. This proves connectivity and explicitly reports that the scientific model is not implemented.

The numerical kernel will be a pure Python/NumPy module with no HTTP or UI dependencies. FastAPI validates requests and serializes results. React must not independently implement plume physics or silently reinterpret units. NumPy array operations own cell/class computations; scenario orchestration needs a declared memory budget.

## Current API contract

`GET /api/health` returns `status`, `service`, `version`, and `model_status`. Its values describe the development foundation, not an available simulation. Swagger UI is at `/api/docs`; OpenAPI is at `/api/openapi.json`. No simulation route exists yet.

Export the running application's schema with `scripts/export_openapi.py`, then generate `frontend/src/api/schema.d.ts`. Regenerate types after backend contract changes and review the generated diff alongside the caller. The frontend uses a relative `/api/health` URL; Vite proxies locally. A cross-origin CORS exception is not required for this path.

The development backend is bound to `127.0.0.1`. The Vite server also binds locally with a strict port so a failed startup does not silently change the URL. Future deployment should define origin/serving policy explicitly; no production deployment claim is made here.

## Proposed future contracts (not implemented)

Simulation requests should carry a scenario/source identity, vent longitude/latitude, release-height interpretation, mass rate and duration, bulk density, class fractions/settling velocities, wind speed and wind-from bearing, and bounded grid/dispersion settings. Do not duplicate derived total mass as an independent editable parameter without a consistency rule.

Responses should identify the model/version, input/source revisions, projected CRS, grid axes and cell convention, load/thickness units, finite-domain accounting, municipality point samples with coverage status, criteria with their units/sources, population accounting, and explicitly limited aviation screening. Reject nonfinite values instead of serializing NaN/Infinity to JSON.

For the nominal 200 km / 1 km domain, distinguish 200 cell centers per axis from 201 boundary points. Wind-sweep results need angular resolution and completeness metadata. Do not allocate a large direction-by-class-by-grid tensor without a budget.

## Validation boundaries

FastAPI, frontend build, and generated types establish application behavior only. Numerical validation needs cited equations, physical invariants, dimensional checks, independent numerical cases, grid sensitivity, and source-backed inputs. Historical replication requires independent observations with a declared comparison method. Ground ash deposition cannot establish airborne concentration or certify airport safety.

The first development milestone after preparation is a reviewed scientific specification and manual source registry. It must resolve the open decisions in `PROJECT_CONTEXT.md` before hazard claims or realistic presets appear in the application.
