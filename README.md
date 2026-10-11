# ABO

[Contributor setup](CONTRIBUTING.md) · [Repository map](repository_map.md) · [Agent instructions](AGENTS.md) · [Bundled skills](skills/README.md) · [Evidence and artifact policy](docs/REPOSITORY_HANDOFF.md)

Academic Gaussian fallout simulator for CSE 103. Python computes eventual ground deposition; React presents an interactive 3D scientific illustration, geographic contours, receptor screening and wind sweeps.

The 11 October QA revision adds a frozen Taal evidence protocol, an auditable parameter register, archived NOAA soundings, independently digitized published contours, explicit administrative coverage, census-year selection and conditional screening reasons. [Gap register](docs/GAP_REGISTER.md), [delivery evidence](docs/GAP_CLOSURE_DELIVERY.md) and [independent QA](docs/GAP_CLOSURE_INDEPENDENT_QA.md) distinguish verified implementation from remaining source blocks. The editable IMRaD manuscript is `docs/ABO_RESEARCH_IMRAD.docx` (Arial 11 pt body / 12 pt headings).

The eruption workspace now includes one before/during/after timeline, finite-duration ash accumulation, wind-driven billows, a schematic Taal fountain and optional terrain-guided Mayon lava. The adjacent map uses timed ash contours or the reached channel footprint; tables/CSV retain labeled eventual ash totals. [Sequence equations](docs/ERUPTION_MODEL.md), [research applicability](docs/ERUPTION_RESEARCH.md) and [QA evidence](docs/ERUPTION_QA.md) separate numerical checks from assumed teaching physics. Plume formation and cooling appearance are illustrative; this is not a validated eruption or lava hazard forecast.

The opening workspace pairs geographic 3D terrain with the impact map, stacking them on phones. Source-traced local elevation and lake/coast assets work offline; they provide display context without changing the flat-ground solver. See [geographic and picture references](docs/GEOGRAPHY_REFERENCES.md).

Start with [project context](PROJECT_CONTEXT.md), [Windows instructions](docs/DEVELOPMENT.md), [computation](docs/COMPUTATION.md), [input values](docs/INPUT_VALUES.md), and [validation evidence](docs/VALIDATION.md). The [independent implementation review](docs/IMPLEMENTATION_QA.md) separates numerical evidence from historical accuracy.

## Development

- Backend: Python 3.12, FastAPI, NumPy, SciPy, pyproj, ContourPy, Shapely, uv.
- Frontend: React 19, TypeScript, React Three Fiber 9, Three.js, Leaflet, Vite, npm.
- Quality: Ruff, pytest, ESLint, Vitest, generated OpenAPI types, production build.

Run `./scripts/setup.ps1`, then `./scripts/start.ps1` in PowerShell. Open http://127.0.0.1:8000. No database, account or MapTiler key is needed. The bundled coastline works offline after installation. Dependencies and optional online basemaps require network access.

Three teaching presets use explicitly illustrative physical inputs. The catalog includes 318 municipal/city records with 2024 populations, 34 sourced 2020 population records, and two airport reference points. Unresolved domain records and missing years remain visible. Two derived Taal contours are available, but both share one published source. The candidate historical winds fail the frozen altitude-coverage gate; independent eruption inputs and damage criteria remain incomplete, so historical validation stays unestablished. Academic ground screening does not establish building safety, water potability or airborne aviation safety.
