# Frozen Taal retrospective protocol

Protocol identity: **taal-main-plume-2020-v1**. Frozen 2026-10-11 before any model agreement calculation. Dataset identity: **taal-published-evidence-v1**. This protocol separates numerical verification, input readiness and empirical agreement. Public evidence availability cannot establish predictive validation by itself.

## Event, datum and dependencies

The target is the main mapped fallout episode from **12 January 2020 13:00 to 13 January 2020 04:28 Philippine Standard Time (UTC+8)**, equivalent to **12 January 05:00–20:28 UTC**, duration **55,680 s**. The interval is stated in the deposit-volume section of Balangue-Tarriela et al. (2022), DOI [10.1007/s00445-022-01534-y](https://link.springer.com/article/10.1007/s00445-022-01534-y). Figure 4 rounds its endpoint to about 04:00; Figure 2's intense seismic/plume interval (17:00–03:00) is narrower, and the fountain transition is another event definition. These endpoint-definition differences remain disclosed rather than used as fitting choices. It is not the entire eruption. Observations collected later can include additional pulses, remobilization and erosion; their interval mismatch must remain visible.

The cited 17–21 km plume range is **above sea level**. Conversion to height above the model ground is `H = z_plume_ASL - z_vent_ASL`; the vent elevation must come from the reviewed vent record. The study's deposit-inferred plume estimate is a separate, dependent estimate. Deposit-derived volume, inferred mass, inferred plume height, contours and field/crowd thickness belong to one **taal-deposit-study** dependency family. Contour vertices cannot count as independent observations. Preserve narrative 8,605 km² and Table 3 3,864.89 km² separately with source locators and definitions unresolved; neither is a polygon or a target selected to favor the model.

## Wind acquisition and processing, frozen before evaluation

Public candidate: NOAA IGRA 2.2 station **RPM00098433 (Tanay)**. Download the station period-of-record ZIP and authoritative format/station-list documents explicitly during curation; the app performs no external fetching. Archive selected **12 January 2020 00:00 and 12:00 UTC** profiles when actual launch records exist, including header release time, source fields and per-level QC. These scheduled observations bracket or overlap the eruption; their time offset and distance from Taal are representativeness limits. Do not infer wind from Amihan alone. Missing launches remain missing.

Use geopotential height above mean sea level from the record, with no unreported geometric conversion. Select heights **1,000–21,000 geopotential metres ASL** and actual finite wind direction/speed. Reject NOAA missing values (`-9999`, `-8888`), direction outside 0–360, negative speed, and height outside the band. GPH `ZFLAG` blank/A/B documents processing scope, not a binary valid/invalid classification; accept non-sentinel heights with these documented flags, preserve their counts and reject undocumented flags. Wind has no independent per-level quality flag in this format. WSPD is in **tenths m/s**. Missing wind QC is a limitation, not proof of a passed check. Header HOUR is the nominal synoptic UTC hour; RELTIME is actual release HHMM. Use complete RELTIME when present, preserve partial `hh99` as hour-only and missing `9999` explicitly, and use nominal time only as a labeled fallback. Duplicate heights are consolidated by averaging their east/north vectors. Convert meteorological wind-from direction to `u_E=-U sin(f)`, `u_N=-U cos(f)` before averaging.

Interpolate each launch's wind vectors on a **1,000 m fixed height grid** only within its observed height coverage; no vertical extrapolation. Require at least two accepted levels and at least **75%** of the 21 grid heights covered for an effective profile. This engineering coverage gate is not a measured accuracy tolerance. Average accepted height-grid vectors equally, then accepted launches equally. Report coverage, range/variation, station distance and event offsets. Below **0.1 m/s** resultant speed, direction is unavailable (calm); do not invent a preferred bearing. No effective wind is promoted to a historical simulation until launch/QC and representativeness review completes. NOAA data are public US-government records; document upstream attribution and any station provider conditions separately.

## Observation acquisition and split

Prefer independent eruption mass, duration, density and grain/settling inputs, reserving all deposit observations for evaluation. If adequate independent inputs exist, no calibration is performed. Otherwise only **diffusivity K** and **initial spread sigma0** may be calibrated after written review; ash mass, bulk density, release weights and grain speeds are not fit in this version. Thickness identifies the ratio `M/rho_bulk`, not mass and density separately.

Use geolocated original observations with reported thickness intervals and uncertainty. Named towns or photos without a measured coordinate are not precise point observations. A published isopach may be digitized as **derived evidence** only with reproducible georeferencing, two independent traces, control-point residuals and inter-trace disagreement. Both traces must derive from the same source identity and cannot establish an independent sample count. A figure raster alone is insufficient to declare an accepted spatial dataset.

If calibration becomes necessary, assign complete spatial groups by a frozen, deterministic group ordering to **70% calibration / 30% evaluation**, rounded down for calibration with at least one evaluation group. Duplicate locations and shared measurements stay in one group; source families spanning multiple groups are assigned wholly to one partition or excluded from point-independent claims. Freeze identities and the resulting split before fitting. Never tune against evaluation observations. A single dependent contour family cannot be split into fictitiously independent points.

## Metrics, tolerance and assessment

For a thickness interval `[a,b]`, the signed interval residual is `p-a` when `p<a`, `p-b` when `p>b`, otherwise zero. Report **interval-distance RMSE and MAE**, midpoint RMSE/MAE using `(a+b)/2`, interval coverage, covered/out-of-domain count and per-observation spatial residuals. Compatibility `rmse_mm` means interval-distance RMSE. Midpoint error is descriptive and does not replace interval uncertainty. Zero predictions for positive intervals remain counted; undefined multiplicative ratios remain null.

Compute reporting-footprint IoU at the **0.5 mm** cutoff from both accepted digitizations, restricted to the fixed model domain. Publish domain clipping. Do not use area alone as IoU. Assess cell sizes **0.5, 1 and 2 km**, release layers **8, 16 and 32**, and source-supported uncertain input endpoints without refitting. All perturbations retain source/dependency labels.

The study applied 10% thickness/diameter and 20% distal-limit errors in its fitting procedure; these are **study fitting assumptions**, not a complete confidence interval for geolocation, erosion, digitization or ABO prediction. No defensible predictive acceptance tolerance is presently established. Until original measurement intervals, spatial uncertainty and independent physical inputs are usable, all comparisons are **descriptive, validation not established**. A failed frozen agreement must remain `evaluation failed`; unavailable evidence is `source blocked`. Numerical tests cannot change this status.

## Pre-evaluation gate

Independent QA must classify the event interval, wind profiles, vent datum, mass/density, grains/settling, dispersion and observation geometries as usable or blocked before an empirical run. This document is the frozen protocol; source curation may append availability evidence but may not alter processing or tolerances after viewing agreement. A revised protocol requires a new identity and disclosure.

## Availability review appended 2026-10-11

Independent QA approved the frozen methodology before dependent evaluation. **The physical source gate remains blocked**, and no historical model agreement was calculated. This appendix records acquisition outcomes without changing the rules above.

| Required evidence | Classification and finding |
| --- | --- |
| Main mapped event interval | Usable derived interval, 55,680 s; endpoint-definition uncertainty retained |
| Wind | Source blocked: both selected Tanay launches cover 15/21 frozen grid positions (71.43%), below 75%; no extrapolation or gate relaxation |
| Active vent datum | Source blocked: published 311 m profile is not a reviewed survey of the active 2020 vent |
| Ash mass and bulk density | Source blocked: no independent values; volume/thickness-derived quantities share deposit dependencies |
| Emitted grains and settling speeds | Source blocked: no reviewed whole-event class inputs |
| K and sigma0 | Assumed teaching inputs only; no calibration performed |
| Reference footprint | Usable as derived geometry: two independently frozen traces of Figure 4a, source hashes verified and repeatability reproduced by QA |
| Point observations and original uncertainty | Source blocked: no exposed raw CSV or accepted precise thickness-point dataset; original measurement/interpolation uncertainty not fully quantified |
| Empirical tolerance | Source blocked: no defensible predictive acceptance bounds established |

The official NIH PMC open-data archive supplied the article XML/PDF and actual Figure 4 JPEG. Both manual traces use printed longitude/latitude controls; WGS84 interpretation is an explicit assumption because the original map datum is not stated. Geodesic areas are 8639.95 and 8656.14 km²; local vent-centered projected intertrace IoU is 0.97918 and densified boundary Hausdorff distance is 1901.34 m. These are **digitization repeatability**, not model validation. About 4.98% and 4.88% of the projected reference areas lie outside the fixed domain. Both traces share one dependency family and contribute zero independent point observations.

All 318 municipality/city records have reviewed 2024 counts; 34 Batangas records also have 2020 counts. Unresolved administrative matches, historical boundary continuity, additional 2020 counts and water-facility inventories remain explicitly incomplete. These inventory limits affect reporting coverage and are separate from ash-kernel verification. General building/agriculture impact guidance does not supply reviewed condition-specific local damage thresholds.

Reproduce with `scripts/curate_taal_contours.py`, `scripts/build_catalog.py` and `scripts/build_parameter_register.py`. Source manifests are in `data/source/igra/`, `data/source/taal-study/` and `data/source/gap-curation-manifest.json`. Independent evidence is recorded under `qa/gap_closure/`.
