# Local development

## Current single-port installation and startup

In PowerShell at your repository root (see [CONTRIBUTING.md](../CONTRIBUTING.md) for clone prerequisites):

```powershell
./scripts/setup.ps1
./scripts/start.ps1
```

Open http://127.0.0.1:8000. Setup performs locked installs, API generation, Python tests including independent QA, React checks and production build. Startup serves built assets and the API together on loopback. Ctrl+C stops it. Use `./scripts/start.ps1 -Port 8001` if needed; do not kill unrelated processes. `-SkipChecks` still builds but omits verification.

No MapTiler key is needed. Normal computations, replay, tables, exports and the local coastline work offline after installation. Optional `VITE_MAPTILER_KEY` is a browser-public, origin-restricted key used during build. Documentation is served at `/documentation/`. Developer split-server commands below remain usable. Stop Vite before reinstalling npm dependencies on Windows.

Reload open browser tabs after rebuilding. An old tab can refer to lazy assets replaced by a new build; the view error state preserves its table and offers reload. If Python stops during a run, completed results stay visible; restart with `scripts/start.ps1` and retry Run.

Rebuild curated inputs explicitly with `uv run --project backend python scripts/build_catalog.py`, then check catalog consistency. Full Python verification is `uv run --project backend pytest backend/tests qa`. The model passes numerical checks but lacks reviewed historical agreement; current evidence is in `VALIDATION.md` and `IMPLEMENTATION_QA.md`.

## Archived foundation instructions

Run commands in PowerShell. The project root is `C:\Workspace\ABO-CS`. Keep the backend and frontend in separate terminals; both bind only to this machine.

## Prerequisites and install

Use Git, [uv](https://docs.astral.sh/uv/getting-started/installation/), and Node 22.13+ within 22.x, or Node 24+, with npm. Node 23 does not satisfy the complete locked toolchain. The repository targets Python 3.12; uv can install that interpreter without replacing the host's global Python. The initial setup used the host's uv 0.11.7, Node 25.9.0, and npm 11.19.0. Those observations do not impose a global version change. Frontend installs enforce compatible engines through `.npmrc`.

Backend:

```powershell
Set-Location C:\Workspace\ABO-CS\backend
uv sync --locked
```

Frontend:

```powershell
Set-Location C:\Workspace\ABO-CS\frontend
npm ci
npm run api:types
```

Commit both lockfiles and the generated OpenAPI JSON/types when backend contracts change. `.venv`, `node_modules`, caches, local environment files, and build output are ignored. Dependency downloads during installation are distinct from the proposal's prohibition on live scientific-data APIs.

## Run

Terminal 1:

```powershell
Set-Location C:\Workspace\ABO-CS\backend
uv run uvicorn abo_api.main:app --host 127.0.0.1 --port 8000 --reload
```

Terminal 2:

```powershell
Set-Location C:\Workspace\ABO-CS\frontend
npm run dev
```

Open [local React starter](http://127.0.0.1:5173). The starter checks Python connectivity only. Swagger UI is [local API docs](http://127.0.0.1:8000/api/docs); the health contract is [local health](http://127.0.0.1:8000/api/health).

Stop each process with Ctrl+C in its own terminal. Do not stop unrelated processes to free a port. If 8000 is occupied, start the backend on a free port and set `ABO_API_TARGET` in `frontend/.env.local`, then restart Vite. Copy only the example settings you need; no environment file is required for the default ports. If 5173 is occupied, use `npm run dev -- --port <free-port>`; strict port mode prevents silent fallback.

On Windows, stop this project's Vite server with Ctrl+C before rerunning `npm ci`. Vite loads a native build module that Windows can lock while the server is running, preventing npm from replacing it. If that blocks an install, stop the project server, rerun `npm ci`, then restart it after the checks pass.

## Check changes

Backend:

```powershell
Set-Location C:\Workspace\ABO-CS\backend
uv run ruff check . ../scripts
uv run ruff format --check . ../scripts
uv run pytest
```

Frontend:

```powershell
Set-Location C:\Workspace\ABO-CS\frontend
npm run api:types
npm run check
```

`check` runs ESLint, TypeScript, Vitest, and the production build. TypeScript is held at 5.9 to stay within the installed ESLint parser's supported range; the newest TypeScript package is not automatically the compatible choice for the complete toolchain.

The API types command exports the actual Python application's OpenAPI to `frontend/openapi.json`, then generates `frontend/src/api/schema.d.ts`. Do not hand-edit either generated file. CI also checks for an unexpected schema/type diff. An import or response field change must update every affected caller.

## Archived Stage 0 status

At Stage 0, only the local health endpoint, generated contract and React connection starter existed. This paragraph is retained as preparation history; the current simulator, map, table, sweep and historical-reference interface are described in `IMPLEMENTATION_STATUS.md`.

The current application uses explicitly illustrative teaching scenarios and synthetic test fixtures. Reviewed scientific scenarios and historical agreement still require the missing source-backed inputs listed in `INPUT_VALUES.md`.

Local foundation results and the initial skill review are recorded in `docs/QA_REPORT.md`; current evidence is in `GAP_REGISTER.md` and `GAP_CLOSURE_DELIVERY.md`. GitHub workflow results are scoped to their actual commit/run and do not establish browser, document or empirical scientific validation.
