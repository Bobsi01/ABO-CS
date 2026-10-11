---
name: abo-python-react
description: Build or change ABO's FastAPI and React TypeScript application, local API contracts, dependencies, and developer workflow. Use for application integration, not selecting physical ashfall equations.
---

# ABO Python + React

Resolve paths through `repository_map.md`. Python owns computation and input validation; React owns presentation and interaction. Scientific input files are manually sourced. Local HTTP between React and FastAPI is permitted by the recorded interpretation; external scientific-data APIs are not.

- Keep the numerical kernel independent of FastAPI and React. No database, authentication, external weather service or deployment is required. The approved MapTiler basemap is presentation only, with attribution and bundled offline coastline. A browser key is public and must be origin-restricted; never embed private credentials.
- Python contracts use explicit units and constraints. Derive frontend types from actual FastAPI OpenAPI rather than maintaining a second handwritten schema. For shared changes, update validators, responses, generated types, callers, and relevant tests together.
- Do not expose a simulation endpoint or return synthetic hazard results until the scientific kernel is implemented. A health response confirms connectivity only.
- Follow `docs/DEVELOPMENT.md`: uv locks the backend environment; npm locks the frontend. Run checks from their documented directories. Do not upgrade global tools or unrelated workspaces to resolve a local dependency issue.
- In development use Vite's relative `/api` proxy, scoped local binding and an explicit API target. Validate malformed responses and failed connections, abort obsolete requests, and give a useful retry action. Never embed secrets in frontend environment variables.
- Bound future simulation request sizes and resource use on the server; frontend input limits alone cannot protect the model from excessive grid or wind-sweep allocations.
- Read local anti-slop core and UI skill for interface work, together with the approved design direction. Preserve truthful empty/loading/error states and the academic result labeling. Do not create impressive-looking contours, counts, or municipality rows without a computed and sourced data path.
- Verify the affected behavior: backend lint/tests, schema generation, frontend lint/typecheck/tests/build, then browser evidence when the user flow changes. Distinguish build proof, live integration, and scientific validity.

- Python supplies representative E/N/Z settling paths and grids; React interpolates them. Shared results always refer to the last submitted scenario. Pause replay by default and while hidden, honor reduced motion, render on demand when paused and provide a WebGL2 fallback. Browser/GPU proof is separate from unit tests.

Primary tool references: [FastAPI first steps](https://fastapi.tiangolo.com/tutorial/first-steps/), [Vite guide](https://vite.dev/guide/), [React documentation](https://react.dev/learn), [uv projects](https://docs.astral.sh/uv/guides/projects/).
