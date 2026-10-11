# Further independent scientific QA — 2026-10-10

The user requested two additional QA agents. This report belongs to the scientific/backend evaluator. Implementation corrections belong to the orchestrator; the evaluator changed only this report and `qa/test_further_scientific_qa.py`. Browser evidence belongs to the separate UI evaluator.

The new cases independently derive wind maxima, finite-source parcel age moments and inclined lava travel/volume. They extend prior checks rather than treating the existing 81 Python passes as sufficient proof. All generated physical fixtures are synthetic. Five population spot checks use freshly read official PSA data.

## Findings and reproduction

| Finding | Before correction | Correction / current evidence |
| --- | --- | --- |
| P2 — isotropic vent sweep invents a preferred bearing | `kernel.py:sweep_maxima` used Cartesian wind components whose squared norms varied by floating-point round-off. A synthetic receptor exactly at the vent returned 4° for U=3 m/s and 7° for U=10 m/s, despite mathematically identical loads under every wind bearing. | The orchestrator rotated receptors into a wind-aligned basis and retained the lowest-angle exact tie. Independently rerun vent cases at 0, 3, 10 and 100 m/s pass. Four off-vent oblique-bearing cases also pass independent scalar polar expectations; genuine directional peaks remain distinct. |
| P2 — accepted scenario returns fewer than the contracted snapshots | `eruption.py:snapshot_times` collapsed the tail when H=1e-12 m and T=31,536,000 s. The endpoint returned HTTP 200 with 19 frames for a requested 37, below the frontend's accepted 25–49 range. The old resolution guard covered only the opposite magnitude imbalance. | The orchestrator added a requested-count/strictly-increasing clock guard before frame tensors. The impossible clock now returns 422. Representable durations 0.001, 3,600 and 31,536,000 s retain all 49 requested frames, exact source stop and final arrival. No physical fall time is enlarged to manufacture a timeline. |
| P2 — malformed local DEM axes can crash or silently change lava travel | `eruption.py:lava_result` checked array shape and elevation values but did not enforce the axis assumptions used by `channel_routing`. A 1×1 temporary DEM caused HTTP 500. A 3×3 DEM with east positions [-250, 0, 500] returned 200 while every D8 edge used the first 250 m spacing. | The orchestrator now requires finite, increasing uniform one-dimensional axes with 2–401 samples and a recognized land/water mask, and handles malformed origin/array data explicitly. Independent fixtures now return clean 422 responses for insufficient samples, nonfinite and nonuniform axes. Temporary QA assets do not modify the bundled DEM. |
| P3 — terrain-source role metadata became stale after lava was added | Mayon's asset called itself a display snapshot and explicitly said it was not a solver input; the source manifest called every asset display only. This contradicted the raw DEM's actual use in the lava teaching model. | The orchestrator corrected the curation script, Mayon asset and its four raw HGT source roles. Fresh readback identifies raw Mayon lava use and continues to exclude terrain-aware ashfall. All three asset SHA-256 values match the updated manifest. Taal/Kanlaon assets remain unchanged. |

The five population spot checks match current official 2024 POPCEN columns: Santa Teresita 21,742, Taal municipality 61,559, Talisay 46,477, Daraga 138,000 and Malilipot 41,066, with their ten-digit PSGC identifiers. These are **five checks**, not a fresh verification of every municipal transcription. Sources: [PSA Batangas](https://psa.gov.ph/classification/psgc/citimuni/0401000000), [PSA Albay](https://psa.gov.ph/classification/psgc/citimuni/0500500000).

## Numerical and contract evidence

The evaluator's new fixture file contains **26 cases**, all passing after the orchestrator's corrections. An independent full rerun of `uv run pytest tests ../qa` passes **107 cases in 5.32 s**. Full Python lint passes and the QA fixture is formatted. The evaluator's immediate whole-project format check caught one wrapping-only line in the latest implementation patch; the orchestrator was notified to format it before delivery. Reproduction from `backend/`:

```powershell
uv run pytest ../qa/test_further_scientific_qa.py
uv run ruff check ../qa/test_further_scientific_qa.py
uv run ruff format --check ../qa/test_further_scientific_qa.py
```

**Scoped scientific/backend QA gate: PASS for the reproduced defects and synthetic/reference behavior tested here.** Reviewed-data and historical-agreement gates remain open. This pass found three actionable numerical/data-handling defects and one source-role metadata defect; the implementation owner corrected all four and the evaluator reran the reported regressions.

Additional passing expectations cover:

- Mass-weighted parcel centers and spread for five independent observation clocks, derived from the surviving source-emission age interval.
- Integrated agreement between a 50-cell scene snapshot and a 60-cell native grid across all returned clocks.
- A three-segment variable-slope lava route: depth normal to the incline, velocity along the incline, three-dimensional path length, travel time and discharge-volume closure.
- Missing roof/crop criteria stay unknown even for a deliberately large synthetic deposit. Airport/water surface exposure does not acquire damage or potability claims. Missing municipality population remains explicitly counted as unknown.
- Unique catalog records, resolved receptor source IDs and the displayed 2024 population year; manually inspected hashes for all bundled terrain assets.

The existing finite-pulse expression is dimensionally consistent: integrating emission times b satisfying 0≤b≤T and b+tau≤t gives `Q*w/layers * clip(t-tau,0,T)`, equivalent to the implemented final component mass times its arrived fraction. The parcel age interval yields the complementary still-aloft mass. The new age-moment fixtures inspect component centers as well as total mass.

## Fresh primary-source review

This pass browsed primary publishers and agencies. Direct page access and cached publisher text are distinguished below; source access does not validate the simulator against an eruption.

- [Borch, Jones and Russell (2025)](https://www.nature.com/articles/s43247-025-02991-x): the publisher's searchable text independently confirms Eq. 3, the Newtonian mean speed `rho*g*h²*sin(beta)/(3*mu)`, and the analog experiment context. Fresh direct HTML/PDF retrieval redirected to an inaccessible publisher authentication endpoint. This pass therefore does not claim a new full-PDF or equation-image inspection. The independently derived inclined-distance/depth cases pass; assumed Mayon values and single-channel routing remain uncalibrated.
- [USGS lava-hazard FAQ](https://www.usgs.gov/observatories/hvo/frequently-asked-questions-and-answers-about-lava-flow-hazards): the full page supports the roles of effusion/duration, viscosity, slope and confinement. It does not supply ABO's Mayon material properties, prescribed footprint width or field runout.
- [PHIVOLCS Mayon, 24 November 2023](https://www.phivolcs.dost.gov.ph/mayon-volcano-bulletin-24-november-2023-8-00-am/): the full bulletin confirms named lava gullies and the dated 6 km multi-hazard PDZ. The teaching route is not claimed to reproduce those gullies.
- [PHIVOLCS Kanlaon, 4 June 2024](https://www.phivolcs.dost.gov.ph/volcanic-activity-report-kanlaon-volcano-negros-island-04-june-2024/): the full report distinguishes PDCs/ballistics from lava and identifies a four-kilometer PDZ. Omitting a default effusive channel for that explosive teaching scene is justified.
- [PHIVOLCS Taal, 15 February 2021](https://www.phivolcs.dost.gov.ph/taal-volcano-advisory-15-february-2021-03-30-p-m/): the primary text identifies Volcano Island as the PDZ. A dated shoreline outline remains contextual geometry, not an official/current GIS advisory.
- [Taal deposit study (2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8889389/): direct initial article text confirms 17–21 km ASL, later fountaining and observation/erosion uncertainty. Subsequent direct access showed CAPTCHA; the publisher's indexed Table 3 independently confirms 0.05 cm / 0.5 mm and 3864.89 km², while the abstract states 8605 km². Preserving both values and withholding IoU without an observation polygon is appropriate.
- [USGS Pinatubo Koyaguchi chapter](https://pubs.usgs.gov/pinatubo/koya/): indexed primary text supports buoyant column and umbrella-cloud concepts. Direct access returned 403 in this pass. ABO does not implement those plume dynamics or a concentration solver.

## Evidence limits and skill evaluation

The physical presets are teaching assumptions. Source-reviewed geography/populations do not make eruption mass, effective plume wind, grain behavior, density, diffusion or lava rheology reviewed. Seasonal wind presets, held-out geolocated Taal observations, historical 2020 populations and condition-specific damage criteria are still unavailable. These open gates remain correctly disclosed. Numerical agreement with synthetic equations is **not historical validation**.

The numerical and QA skills were useful for deriving new degenerate-wind and clock-resolution cases, for keeping inclined lava speed separate from map distance, and for requiring graceful local-data failures. Valid counterexamples cover off-vent directional peaks, long but representable clocks, unknown criteria and a corrected lava relation. The source-role drift shows why research metadata needs review after model scope changes. These observed benefits do not prove universal skill accuracy or a calibrated forecast.

This report does not certify browser/GPU behavior, measured real wind profiles, current PHIVOLCS hazard zones, complete census transcription or actual eruption agreement. The independent UI report covers its own observed browser scope.
