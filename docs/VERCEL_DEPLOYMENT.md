# Vercel deployment

Production: https://abo-cs.vercel.app

The `abo-cs` Vercel project belongs to the `projs4` workspace. Deployment uses the
repository root and the FastAPI framework. `app.py` imports the existing backend
source directly so its catalog, terrain and documentation paths retain their meaning.
Vercel builds React with `npm --prefix frontend ci` and `npm --prefix frontend run build`.
The API and UI share one origin; no external scientific-data collection is added.

## Runtime and assets

- `.python-version` selects Python 3.12. `requirements.txt` pins runtime dependencies
  exported from `backend/uv.lock`; development tools are excluded.
- Regenerate pins after changing the backend lockfile:
  `uv export --project backend --frozen --no-dev --no-emit-project --no-hashes --output-file requirements.txt`.
- `.vercelignore` omits QA archives, source-download archives, generated local
  installations, environment files and document binaries from uploads. The build
  includes the curated catalog, backend source, processed public terrain, bundled
  geography and Markdown documentation needed by the application.
- `vercel.json` sets a 60-second function duration. Standard admission and numerical
  request-size limits remain enforced by the existing backend.
- The deployment entry point enables gzip for supported clients. The default Taal
  timeline is approximately 23.5 MiB decoded and 5.7 MiB compressed in the local
  deployment check. Vercel's Python streaming runtime handled the complete decoded
  response in a live request; compression alone does not put it below 4.5 MB.
- `.vercel/` contains the local account/project link and is ignored by Git. Do not
  commit it or copy account authentication state into this repository.

## Publishing

Authenticate with `npx vercel login`, then deploy from the repository root with
`npx vercel deploy --prod`. Use the intended Vercel project/workspace when linking
a new checkout. Check `/api/health`, `/api/catalog`, a complete simulation and
eruption sequence, bundled geography and the actual UI after publishing.

The initial CLI attempt could not connect the private GitHub repository to Vercel.
Deployments currently use CLI uploads; Git pushes alone do not publish a new version.

## Evidence and limits — 22 October 2026

See `MOBILE_UI_20261022.md` for mobile/tablet and desktop layout checks. A Vercel
deployment is not evidence of historical predictive accuracy. Physical-phone touch,
mobile Safari, GPU performance, high traffic and the largest permitted sweeps remain
separate checks. The compute semaphore is per function instance rather than a
global concurrency or billing limit.
