# Contributing to ABO

Read [AGENTS.md](AGENTS.md), [project context](PROJECT_CONTEXT.md), [repository map](repository_map.md) and the current [gap register](docs/GAP_REGISTER.md) before changing the project. The latest dated integration entry takes precedence over archived Stage 0 descriptions.

## Install and run

Install Git, [Git LFS](https://git-lfs.com/), [uv](https://docs.astral.sh/uv/getting-started/installation/) and Node 22.13+ within 22.x, or Node 24+, with npm. Python is pinned to 3.12 and managed by uv. Repository access is required because the GitHub repository is private.

```powershell
git lfs install
git clone https://github.com/Bobsi01/ABO-CS.git
Set-Location ABO-CS
./scripts/setup.ps1
./scripts/start.ps1
```

Open http://127.0.0.1:8000. Run from your own checkout directory; the scripts resolve their location automatically. No database, cloud account or MapTiler key is needed. Installation downloads dependencies; the app and bundled geography work offline afterwards. Optional online basemaps require a browser-public, origin-restricted MapTiler key. Keep local settings in ignored `.env` files.

Git LFS stores two retained browser heap snapshots. A full evidence checkout needs LFS. For application-only work, `GIT_LFS_SKIP_SMUDGE=1` may be set before cloning; use `git lfs pull` later to retrieve these evidence files. GitHub's ZIP download is not the recommended reproducible evidence checkout.

## Verify a change

Follow [the code style guide](docs/CODE_STYLE.md) for readable spacing and short comments. From `frontend/`, run `npm run format` before checking your changes; `npm run check` verifies the same formatting without writing files.

Run from the repository root:

```powershell
uv run --project backend ruff check --config backend/pyproject.toml backend scripts qa
uv run --project backend ruff format --check --config backend/pyproject.toml backend scripts qa
uv run --project backend pytest backend/tests qa
Set-Location frontend
npm run api:types
npm run check
Set-Location ..
git diff -- frontend/openapi.json frontend/src/api/schema.d.ts
```

Commit intentional generated-contract changes with their Python definitions. `npm run check` includes lint, TypeScript, tests and a production build. The GitHub workflow checks locked installs and unexpected contract drift on Linux. Browser/GPU behavior, Word layout and historical accuracy require their own evidence; CI does not certify those.

## Where to work

Python owns scientific calculations and SI contracts; React renders returned quantities. Curated data belong in `data/`, source provenance alongside them, and documentation in `docs/`. Keep helper scripts in `scripts/` and verification/evidence in `qa/`. Start with the [skills index](skills/README.md) for task-specific review guidance. These are ordinary repository files and can be used by any editor or coding agent without a global skills installation.

Use `codex/` for branches created by coding agents. Preserve unrelated edits. Before shared contract changes, trace all callers and update validators, exports and tests together. Record behavior, checks and evidence limits in the handoff. Never replace a missing scientific value with a plausible guess.

The current research paper is editable Word, with its Markdown source and figure generators retained. Optional research and browser tooling is documented in [qa/README.md](qa/README.md). Raw terrain download caches are excluded; bundled processed assets and manifests are included. Re-curation is a deliberate operation, separate from normal startup.

The repository has no blanket open-source license. Respect the source-specific licenses/attribution recorded in manifests and skill provenance, and obtain permission before redistributing material outside the private project.
