# ABO: Taal Implementation Plan (2026)

> **Document Origin & Basis:** This implementation plan is formally based on and derived from `TAAL_FOCUS_QA_AND_DATA.md` (*ABO — Taal Focus, QA Status & Open-Source Data Report*, 12 October 2026; a copy is in `docs/TAAL_FOCUS_QA_AND_DATA.md`). It operationalizes that report's recommendations within the repository rules in `AGENTS.md` and the proposal scope in `PROJECT_CONTEXT.md`.

## Revision 2 (13 October 2026): corrections and user decisions

Revision 1 of this plan (same day) contained errors that are corrected here:

- It proposed a Taal badge reading "Validated Scientific Case". Historical validation is **not established** (`docs/GAP_REGISTER.md`), so that wording is withdrawn. Taal is the *scientific focus* because it is the only volcano with a curated historical reference (two dependent traces of one published 2020 contour, zero independent point observations).
- It named non-existent paths (`backend/src/abo_core/physics.py`, `VolcanoSelector.tsx`, `components/Map/`, `components/ThreeScene/`). The real paths are listed in the phase table below and in `repository_map.md`.
- It copied example values from the source report (TROPOMI bearing/length/DU, dike azimuth, GVP SO2 table) as if they were data. They are unverified and are not used.

The user decided the following on 13 October 2026, after scope conflicts were raised:

| Question | Decision |
| --- | --- |
| Altitude-dependent wind and multi-pulse emission (proposal exclusions) | Skip for now; record as deferred work in the gap register |
| External data sourcing | Archive public sources once with SHA-256 and access date; curate only traceable values, everything else stays unavailable |
| Seismicity, SO2/alert, InSAR, satellite context layers | None. The app stays ash-only; such material may appear only in manuscript discussion |
| Verification toolchain | User installs `uv` and enables script execution; the agent runs the full checks |

## Phases and status

| Phase | Scope after decisions | Real paths | Status |
| --- | --- | --- | --- |
| 0. Environment | Locked installs and baseline checks | `scripts/setup.ps1`, `frontend/`, `backend/` | Frontend `npm ci` done. **Backend blocked: `uv` not installed** |
| 1. Taal focus wording | Taal: scientific focus with a reference contour, agreement not established. Mayon/Kanlaon: teaching illustration, no curated reference event. Preset option names unchanged (retained browser scripts select them by exact name) | `frontend/src/scientificScope.ts`, `scientificScope.test.ts`, `Workspace.tsx`, `Workspace.test.tsx` | Implemented; unit-tested; browser evidence pending |
| 2. Offline source curation | Attempted for manuscript context only | `data/source/taal-activity/manifest.json` | GVP and Bato et al. blocked (HTTP 403); PHIVOLCS page resolved to a 2019 bulletin. **No values curated** |
| 3. Wind profile and pulses | Deferred (proposal exclusion) | `backend/src/abo_api/kernel.py`, `eruption.py`, `contracts.py` would be affected | Not implemented by decision |
| 4. Map and 3D context layers | Withdrawn by decision. The existing dated PDZ reference (`components/eruptionResearch.ts`, `GeographicMap.tsx`) is unchanged | n/a | Not implemented by decision |
| 5. Verification and documentation | Gap register, repository map, checks | `docs/GAP_REGISTER.md`, `repository_map.md` | Register updated. Manuscript unchanged: no verified post-2020 source exists to add |

## Remaining work that needs input

1. Install `uv`, then run the backend lint, format and tests, plus `npm run api:types` (`AGENTS.md` handoff checks). No Python contract changed, so no contract drift is expected.
2. Take browser evidence of the new scope note for Taal, Mayon and Kanlaon in light and dark themes and at 320 px width (`AGENTS.md` requires browser evidence for changed user flows).
3. To discuss post-2020 activity in the manuscript, retrieve the GVP/PHIVOLCS/Bato sources manually through a browser and archive them under `data/source/taal-activity/`; then the manuscript can be rebuilt and every changed page rendered and inspected.
4. Resolving the 52 unmatched Taal-domain municipalities and extending 2020 census counts remain source-blocked curation tasks (gap register).

## Retained limits

Numerical tests verify software behavior, not eruption prediction. The Taal 2020 reference is one published source, traced twice. The effective historical wind remains unavailable (71.43% Tanay coverage, below the frozen 75% gate). All outputs are academic simulations, not PHIVOLCS advisories.
