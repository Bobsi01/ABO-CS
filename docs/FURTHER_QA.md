# Further QA integration record - 10 October 2026

The user requested two additional QA agents. The scientific/backend evaluator and the UI/3D/map evaluator independently inspected the implementation, reported findings and authored fixtures. The orchestrator reproduced and corrected implementation defects, coordinated builds/restarts and ran the final integration checks. Neither evaluator edited the implementation it assessed.

Independent reports: [scientific QA](FURTHER_SCIENTIFIC_QA.md), [UI QA](FURTHER_UI_QA.md). Their evidence and limits remain separate from the orchestrator's checks below.

## Nine corrected findings

| Area | Root cause | Result |
| --- | --- | --- |
| Wind sweep | Sine/cosine norm round-off invented a preferred wind at an isotropic vent receptor | Wind-aligned evaluation preserves the 0° tie without masking genuine directional peaks; calm wind retains its exact invariant result |
| Timeline | Extreme accepted height/duration ratios collapsed distinct clock values | Unrepresentable requested snapshots fail with an actionable 422 before frame allocation |
| Local lava terrain | Routing assumed uniform, nonempty axes that intake did not enforce | Finite, increasing uniform axes, dimensions, origin and land/water masks are validated; corrupted test assets fail with 422 |
| Terrain provenance | Display-only metadata survived the addition of terrain-guided lava | Mayon asset, four HGT source roles, curation generator and input documentation now describe actual lava use and still exclude terrain-aware ash |
| Hidden input recovery | Native validation blocked submission inside a closed disclosure | The containing panels open, focus moves to the invalid field and a named validation message appears; valid hidden fields remain quiet |
| Map quantity | The lava legend was followed by an unlabeled ash count | The selected effect determines its count; ash and current-time channel intersections are explicitly named |
| Volcano guide | A Taal fountain description appeared without fountain geometry | The label appears only when the sequence contains fountain paths |
| Scene scale | A broad 1:1 claim also appeared beside an enlarged lava ribbon | The HUD names terrain scale and separately identifies enlarged lava width |
| Compass readability | Canvas letters lacked an explicit sRGB color space and faded against terrain | Dark blue letters on opaque white backplates bypass tone mapping and fog; their selected colors have 11.40:1 contrast and the rebuilt desktop/mobile views show readable N/E labels |

The map's snapshot label and computation documentation also distinguish a discrete quantitative frame from smooth interpolation of the qualitative 3D illustration. No additional browser scientific solver was introduced. The first eight corrections were independently retested by their evaluators. The UI evaluator identified the ninth during its final image review; the orchestrator applied it and verified the replacement build and screenshots. The evaluator's follow-up stopped at a usage limit, so a second independent review of that last correction is not claimed. Its original report preserves the handoff state.

## Final verification

- **107 Python tests PASS**, including 26 new independently derived cases; full Ruff lint and formatting PASS. The formatter issue observed during the evaluator's intermediate check was corrected, then the complete checks were rerun. The resumed final run again passed all 107 cases in 5.96 s.
- **47 frontend tests PASS**, including four new independent recovery/mechanism cases; ESLint, TypeScript and production build PASS. The existing terrain-caption expectation was updated to the corrected wording.
- Generated OpenAPI/TypeScript contracts reproduce with unchanged SHA-256 values: `AAC3565F5D2D2B3880789775BD222E2E0FB05ABF23B7EA36FDA21D374EA2CB4C` and `AA86EB9C5F31A305AF14C6A5EBD7264160D9801B2B0B885F366D4BDDA08E4C8F`.
- Local data reproduction PASS: all 121 included population/code pairs, 121 centroid calculations and three source-snapshot hashes; this is a cached-source crosscheck, not fresh primary-site review of all records. The scientific agent separately read five official 2024 population entries.
- Terrain reproduction PASS: 17 cached-source hashes, four output hashes, 15 independent scalar elevation samples and 3,775 source-water samples. Regeneration corrected Mayon metadata while Taal/Kanlaon asset hashes stayed unchanged. Generalized geometry and historical terrain remain limited.
- Live final backend PASS: the saved Mayon teaching request returns 37 snapshots, seven lava vertices and final ash mass 36,000,000 kg with emitted = inside + outside + still-aloft mass. The extreme clock fixture returns the intended 422. The app remains running on loopback port 8000.
- Independent Chrome verification PASS for the reproduced UI fixes, keyboard selectors, before/during/after, point quantities, unavailable history and 320 px light/dark layouts. Details and counterexamples are in the UI report.

Reproduce from `backend/`: `uv run ruff check . ../scripts ../qa`, `uv run ruff format --check . ../scripts ../qa`, `uv run pytest tests ../qa`. From `frontend/`: `npm run api:types`, `npm run check`. Source audits run from the root: `uv run --project backend python qa/audit_data.py`, `uv run --project backend python qa/audit_terrain.py`, `node qa/presentation_audit.mjs` (nine synthetic assertions). Optional raw terrain caches are required for the independent source audit, but not for app startup.

## Final browser evidence and remaining limits

The resumed orchestrator loaded the final `/assets/index-BfdvIUN_.js` build with scene chunk `VolcanoScene-CitUytFQ.js` in the existing in-app browser after restarting the stopped local server. Mayon replay measured **60 rendered fps and 60 browser callbacks/s** in its recent two-second window at a 1440 × 1000 test viewport, with the document visible and no captured application error logs. This meets the 30 fps target in that run. The preceding build measured 43 fps in the orchestrator's earlier in-app run; that result is retained as prior evidence, not the final-build measurement. The independently inspected development machine is an AMD Ryzen 7 5800U / Radeon Graphics, driver 30.0.13032.4000.

The UI agent's stable Chrome session separately measured **1 fps / 1 callback/s** despite a visible document. Window occlusion or foreground scheduling was not established as the cause. That observation remains unresolved; the successful in-app run is not universal performance certification. Long-duration GPU stability, actual context loss, OS reduced motion and a credentialed MapTiler service remain outside fresh browser proof. The roughly 961 kB lazy 3D bundle warning remains.

Final in-app screenshots: [desktop Mayon](../qa/browser/further-mayon-desktop.png), [320 px dark layout](../qa/browser/further-mobile-dark.png), [playback measurement](../qa/browser/further-playback-performance.png). The replacement desktop/mobile files show the corrected scale/effect labels and compass backplates. The narrow document/body width was 310 px within a 320 px viewport in both themes. Capture and review of these replacement images belong to the orchestrator; the UI evaluator reviewed the preceding images before reporting the compass issue. The selected compass ink/backplate colors satisfy the static contrast calculation, but this is not every-orbit canvas accessibility certification. Temporary viewport overrides were reset and the preview was left paused in light theme. Chrome was independently restored to the paused Taal teaching preset before the interruption.

**Scoped numerical/integration and anti-slop workflow gates: PASS for the corrected cases and evidence above.** The full scientific-data and historical-agreement gates remain open. Physical defaults are teaching assumptions; sources support mechanisms and dated context, not calibrated plume shapes, field lava runout or condition-specific damage. Source access restrictions and the preserved Taal footprint discrepancy are recorded in the independent report. No statement here establishes building safety, water potability or airborne aviation safety.
