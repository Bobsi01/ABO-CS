# How ABO computes ground ash deposition

ABO is an academic, reduced analytical fallout model. Python computes scientific quantities; React displays them. The solver is implemented, but agreement with a historical eruption has **not** been established. A realistic-looking scene is not evidence of scientific validity.

The equations below define eventual ash deposition. The finite-duration extension in [ERUPTION_MODEL.md](ERUPTION_MODEL.md) evaluates accumulated deposition before, during and after emission, with separate emitted/aloft/deposited/domain-loss accounting. It also documents the optional terrain-guided lava teaching model. This extension does not change the eventual Gaussian kernel or solve plume buoyancy, gas concentration, variable eruption pulses, wet removal or thermal lava cooling.

## Physical interpretation

The eruption emits a modeled solid ash mass at constant rate. Each grain class settles at a prescribed constant terminal speed. Material released at different heights travels with a uniform horizontal wind while diffusing horizontally. At arrival at flat ground, its spatial distribution is a normalized Gaussian. Summing those distributions gives eventual accumulated **ground load**, not airborne concentration.

This follows the analytical advection–diffusion approach used by models such as [Tephra2](https://github.com/geoscience-community-codes/tephra2), with explicit ABO simplifications: uniform release weights, one effective wind, one horizontal diffusivity, and constant settling speeds. It is not the complete Tephra2 implementation or a validated substitute for it.

The model excludes time-dependent eruption pulses, wind shear, aggregation, wet removal, terrain interception, lahars, gases, ballistic projectiles, and pyroclastic flows. The duration controls total emitted mass under the steady assumption. The result is eventual deposition after settling, not deposition at the instant the eruption stops.

## Inputs and units

| Symbol / contract | Unit | Meaning |
|---|---|---|
| Q / mass_rate_kg_s | kg/s | Modeled solid ash rate; not gas rate or unconverted magma volume |
| T / duration_s | s | Constant-emission duration |
| H / column_height_m | m | Column top above the model ground datum |
| U / wind_speed_m_s | m/s | Uniform effective plume wind speed |
| f / wind_from_deg | degrees | Bearing wind comes FROM, clockwise from north |
| w_i / grain fraction | dimensionless | Fraction of modeled ash mass in class i |
| v_i / settling_speed_m_s | m/s | Constant terminal settling speed of class i |
| K / diffusivity_m2_s | m²/s | Isotropic horizontal diffusion coefficient |
| sigma_0 / initial_spread_m | m | Initial Gaussian standard deviation, not a diameter |
| rho / bulk_density_kg_m3 | kg/m³ | Bulk deposit density, distinct from particle density |
| E,N | m | Local easting/northing relative to the vent |
| L | kg/m² | Accumulated ground load |
| d | mm | Equivalent deposit thickness |

Representative grain diameter is descriptive metadata. ABO does **not** derive terminal speed from diameter: a sourced class speed is an independent required input. Fractions must sum to one within 1e-8; they are never silently normalized.

The API stores mass rate and duration. If the published input is total modeled mass M, convert using **Q=M/T** before submitting the rate; do not enter an independent, inconsistent mass/rate/duration triplet.

Height is above the flat model ground at the vent. If a source reports height above sea level, subtract the vent elevation before entry. Source heights from different datums cannot be substituted directly.

## Coordinate system and wind convention

`kernel.projection` creates a vent-centered azimuthal-equidistant CRS in metres using WGS84. Geographic inputs are longitude, latitude to pyproj with `always_xy=True`. Distances are never computed by treating degrees as kilometres. GeoJSON is returned in longitude, latitude order.

Wind transport components are:

```text
u_E = -U sin(f)
u_N = -U cos(f)
```

Here f is converted to radians for trigonometry. Wind FROM north (0°) transports south; FROM east (90°) transports west; FROM south (180°) transports north; FROM west (270°) transports east. A calm wind is valid; no formula divides by U.

## Release layers and deposition kernel

First derive total modeled mass:

```text
M = Q T                                  [kg]
h_j = H (j + 0.5) / J, j = 0,...,J-1     [m]
m_ij = M w_i / J                         [kg]
tau_ij = h_j / v_i                       [s]
mu_E,ij = u_E tau_ij                     [m]
mu_N,ij = u_N tau_ij                     [m]
s_ij² = sigma_0² + 2 K tau_ij            [m²]
```

The default J is 16 midpoint release heights, equally weighted. Uniform vertical release is an academic assumption rather than an observed eruption distribution. The number can be raised to 32 for sensitivity checks.

At a point `(E,N)`, the deposit is:

```text
L(E,N) = sum_ij [m_ij / (2 pi s_ij²)]
                  exp(-[(E-mu_E,ij)² + (N-mu_N,ij)²] / [2s_ij²])
```

Each term integrates to m_ij over an infinite plane. Its normalization has units kg/m²; the exponent is dimensionless. Contributions from all release heights and grain classes sum to M on the infinite plane. Upwind Gaussian diffusion is retained; artificially removing it would break this normalization.

Implementation: [`components`, `wind_components`, `point_load`](../backend/src/abo_api/kernel.py). Kernel axis `k` flattens `[grain,release]`. Point calculation broadcasts `[direction,k,receptor]` and reduces k. No Python cell, grain, release, receptor, or direction loops are used for calculations.

## Exact grid cell integration

The default domain has edges from -100,000 to +100,000 m and 200 cells on each axis. Centers run from -99,500 to +99,500 m. Arrays are indexed `[north,east]`, with north increasing by row index. There are 201 edges and 200 centers, not 201 cells.

ABO integrates each Gaussian across the full rectangular cell instead of multiplying its center value by cell area. Let Phi be the standard normal CDF. For an east interval `[a,b]`:

```text
P_E = Phi((b-mu_E)/s) - Phi((a-mu_E)/s)
P_N = Phi((d-mu_N)/s) - Phi((c-mu_N)/s)
cell_mass = sum_ij m_ij P_E,ij P_N,ij
cell_average_load = cell_mass / cell_area
```

`gaussian_intervals` uses the equivalent survival-side difference in positive tails to reduce subtraction cancellation. `grid_load` uses a native NumPy `einsum` to combine east/north probabilities without allocating the full kernel-by-grid cube. [SciPy normal CDF reference](https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.ndtr.html).

The finite-domain sum need not equal M. `inside_domain_mass_kg` is the sum of exact cell masses; `outside_domain_mass_kg` is its complement. Out-of-domain loss is a physical coverage limitation. It must not be hidden by rescaling the grid. Zero emitted mass yields zero grid and point deposits; retained fraction is then reported as zero by convention.

Changing cell width subdivides the same integral. The retained mass for the same extent should agree to floating-point tolerance across 1 km and 0.5 km cells. Release-layer sensitivity is different: it changes the vertical integration approximation and must be reported rather than assumed negligible.

## Thickness and receptor screening

```text
d_mm = 1000 L / rho_bulk
```

`kg/m² / kg/m³ = m`; multiplication by 1000 converts metres to millimetres. A municipality result is a **point** value at its recorded representative coordinate. A grid cell is an **area average**. They can differ near a steep gradient without either being wrong.

A receptor outside the square domain has null load/thickness and unknown screening status, even though the analytical formula could evaluate there. This avoids implying map coverage where none is provided. Edges are inclusive, with a one-micrometre tolerance for geographic projection round-off.

The default reporting footprint uses `d >= 0.5 mm`. It is a reporting cutoff, not a damage threshold. Roof and crop criteria are evaluated only when an exact reviewed criterion exists in the local catalog with source IDs. Caller-provided `review_status` cannot certify a criterion. Missing/unreviewed criteria return unknown. Airport/water markers use the reporting footprint for **surface exposure screening**, not airspace safety or chemical water-quality assessment.

Municipality identifiers must be unique. A reported municipality contributes its population once to the indicative reporting count; missing population stays missing and is counted separately. Individual criterion counts may overlap and must not be added as unique residents. These counts classify point-sampled municipalities, not the exposure of every resident or the area-average thickness of a municipality.

## 360-degree wind sweep

`sweep_maxima` evaluates FROM bearings 0 through 359° at 1° intervals against receptor positions only. All other physical inputs stay fixed. Its array is `[360,k,receptor]`; no 360-grid volume is constructed. Receptors are rotated into along-wind and cross-wind coordinates before evaluating squared distance. This is algebraically the same Gaussian, but keeps a vent receptor's distance exactly equal to `(U τ)²` for every bearing, avoiding a false preferred direction from sine/cosine norm round-off. A reduction selects each receptor's largest load. NumPy's first argmax means an exact tie selects the lowest bearing. Calm wind and a receptor exactly at the vent therefore select 0°; no tolerance is used to flatten genuine peaks.

Each municipality can maximize under a different wind. The collection is an **envelope**, not one simultaneous event. Run a normal simulation at a selected bearing to obtain a corresponding full map.

## 3D display and representative paths

Python returns one 33-point settling path per grain class at release height H/2:

```text
t_end = (H/2) / v_i
path(t) = [u_E t, u_N t, H/2 - v_i t], 0 <= t <= t_end
```

The path starts at the vent's horizontal coordinate and ends at ground. It is a representative deterministic advection/settling path; it is not the complete release-height distribution, a particle concentration, or a sampled turbulent trajectory. The ground overlay comes from the full grid, which includes all release layers and diffusion.

React interpolates supplied paths for an accelerated, enlarged-particle illustration. It does not solve deposition again. Source-traced elevation provides geographic context, with a labeled schematic fallback when unavailable. Taal close-up applies a labeled 6× local island-relief transform to make the volcano legible; regional overview restores original relief. Water levels, horizontal positions, Python trajectories, column height and exported physical quantities are unchanged by that transform. See `3D_ILLUSTRATION.md` and `terrainVertexHeightM` in `frontend/src/components/terrain.ts` for the display mapping. All views refer to the last completed result until another run succeeds.

Use a **single physical elapsed time** for all grain classes during playback. For class i, its normalized progress is `min(t / settling_time_s[i], 1)`. A class that settles quickly reaches ground earlier; giving every class the same normalized animation duration would conceal the supplied settling-speed differences. The time compression and particle enlargement are presentation choices, not additional scientific inputs. The ground overlay remains the final eventual deposit during replay: it does not represent ash already deposited at the animated instant.

The representative paths are class-center advection/settling paths, not turbulent particle realizations. Horizontal diffusion is included quantitatively in the Gaussian ground distribution. Repeating particles along those centerlines does not measure airborne particle density. Static elevation, lake, coastline or building geometry may improve geographic orientation, but the solver still computes on flat ground at the vent datum. No terrain collision, orographic wind, ash-water interaction, rainfall washout, or building shielding is inferred from the 3D assets.

Useful quantitative impact-map values are final cell-average thickness in mm, centroid point load in kg/m², the 0.5 mm reporting footprint, domain coverage, and sourced screening statuses. Roof/crop criteria that are not reviewed remain unknown. The illustration cannot turn those unknown impact assessments into damage predictions.

## Reproducible synthetic worked example

This is a mathematical test, **not a Taal scenario**. Use Q=100 kg/s, T=1,000 s, calm wind, K=0, sigma_0=1,000 m and rho=1,000 kg/m³. Use three classes with fractions 0.2, 0.3 and 0.5 and identical speeds of 1 m/s to collapse the mixture into one Gaussian for verification.

1. M=100,000 kg.
2. All horizontal Gaussian centers are at (0,0); all variances are 1,000,000 m².
3. Point load at the vent is `100000/(2*pi*1000000)` = **0.015915494309189534 kg/m²**.
4. Thickness is **0.015915494309189534 mm** at the selected density.
5. For the 1 km square `[-500,500] × [-500,500]`, exact mass is `100000*erf(500/(sqrt(2)*1000))²` = **14,663.14963084119 kg**.
6. The cell-average load is **0.01466314963084119 kg/m²**, lower than the center point value.

`test_worked_example_exact_cell_mass` and `test_grid_centers_exact_integral_point_units` in [`backend/tests/test_science.py`](../backend/tests/test_science.py) verify these statements against independent `math.erf` expressions. Test fixtures are isolated from the production catalog.

## Validation, historical comparison and safety bounds

All contract inputs must be finite. Engineering guards include 2–400 cells per axis, 1–32 release layers, settling speeds >=1e-5 m/s, initial spread >=0.001 m, and bulk density >=0.001 kg/m³. These prevent floating-point singularities; they are not scientifically recommended parameter ranges.

Requests are rejected before allocation when the conservative working-memory estimate exceeds 512 MiB. One calculation runs at a time; a concurrent request receives HTTP 429 and can be retried. Invalid scientific inputs receive HTTP 422. Serialization and local data parsing may use ordinary Python iteration; scientific arrays do not.

For historical evaluation, held-out point observations must include finite coordinates, ordered nonnegative thickness intervals, and calibration/evaluation split labels. Observations outside the modeled square are excluded and counted explicitly. A prediction inside the reported interval has zero range residual. The compatibility key `rmse_mm` means **interval-distance RMSE**, also exposed as `interval_rmse_mm`; `interval_mae_mm`, `midpoint_rmse_mm` and `midpoint_mae_mm` are separate. Midpoint errors use the arithmetic interval midpoint, while multiplicative error uses the geometric interval midpoint for positive observations/predictions. Undefined multiplicative ratios remain null and zero predictions for positive intervals remain counted. The response includes signed interval and midpoint residuals for each covered evaluation observation. Outside-domain rows retain null predictions/residuals and an exclusion reason.

The frozen [Taal protocol](EVALUATION_PROTOCOL.md) distinguishes the main mapped interval **13:00 on 12 January–04:28 on 13 January 2020 local UTC+8**, duration **55,680 s**, from the narrower intense-plume seismic interval. `evidence.check_split_independence` rejects duplicate-location, spatial-group or dependency-family leakage between calibration and evaluation. A contour is one derived dependent geometry, not independent measurements at its vertices. Only diffusivity and initial spread may be considered for a reviewed calibration; fitting mass and density separately to thickness is unidentifiable because thickness depends on their ratio.

`evidence.parse_igra` preserves archived IGRA 2.2 launch times, geopotential-height processing flags and missing/QA-removed values. `effective_wind` converts FROM bearings to E/N vectors, averages duplicate heights, interpolates vectors without vertical extrapolation on the frozen 1–21 km geopotential-height grid, and averages accepted launch means. It rejects missing/removed wind values, undocumented height flags and invalid bearings/speeds. ZFLAG blank/A/B indicates processing scope rather than a binary quality verdict. The two selected Tanay launches have only 15/21 grid levels covered (71.43%), below the predeclared 75% gate, so no usable event-effective wind is returned. Grid-level processing and source snapshots reproduce locally; this is a failed input-readiness gate, not a failed model prediction.

For conditional impact screening, the identical source-reviewed local criterion must specify receptor kinds, an applicability basis and required conditions. `criterion_applicability` matches the selected `screening_context` and receptor-specific conditions; missing/mismatched conditions return unknown with a reason. Receptor-specific metadata takes precedence over a generic selected context. Counts and criterion population sums exclude unknown applicability. Roof/crop criteria remain unavailable when only general vulnerability advice is sourced. Airport/water results use the separate 0.5 mm **surface reporting** screen. A caller's review label cannot certify a threshold. No wetness multiplier is applied without a reviewed bulk-density input.

`SimulationRequest.population_year` selects 2024 by default and 2020 for historical comparison. Local population records are selected by year; missing values remain null instead of falling back to another census. Current official PSGC correspondence codes are preserved separately from any unverified historical boundary continuity. Domain inventory uses administrative **polygon intersection** with the fixed projected square; calculations still sample the centroid, which may lie outside even when the polygon intersects.

### Release-layer sensitivity limit

Exact cell integration guarantees the cell mass of the implemented Gaussian mixture. It does not prove that a finite release-height quadrature is locally converged. In the saved Mayon teaching example, an analytical receptor 50 km northeast gives **0.04111437, 0.02690953 and 0.03182800 mm** for 8, 16 and 32 midpoint layers. The 16-to-32 change is about **18.28%**, despite much smaller changes in total retained mass. The approved 16-layer setting remains an engineering default; individual receptor predictions need sensitivity reporting. Changing 0.5/1/2 km cell size leaves analytical point samples and exact total domain mass invariant, while footprint raster IoU and cell-average display can change. These synthetic checks do not establish Taal accuracy or an empirical uncertainty tolerance.

When an accepted 0.5 mm reference Polygon/MultiPolygon is supplied as `historical.reference_footprint_geojson`, Shapely evaluates membership at every grid center using native vectorized operations. The reported model/reference IoU is **raster/grid-center footprint agreement within the modeled domain at the selected cell resolution**, not exact polygon-area agreement. An empty union returns null. An isopach **area table alone** cannot establish polygon overlap. Available reference geometry does not remove physical-input blockers; empirical metrics stay unavailable until those gates pass.

### Derived contour acquisition and repeatability

`scripts/curate_taal_contours.py` reconstructs each frozen science outline from manual pixel coordinates. Separate least-squares affine fits map pixel x to printed longitude and pixel y to printed latitude. The independent QA trace uses its own frozen pixels and controls. Both trace the printed 0.05 cm outer isopach, converted to 0.5 mm. Longitude/latitude ordering is explicit. WGS84 is an interpretation of the unstated source datum, not a surveyed georeferencing claim.

`pyproj.Geod` calculates WGS84 geodesic enclosed area: **8639.9502 / 8656.1410 km²**. Both geometries are then transformed to the same vent-centered azimuthal equidistant projection used by the model. Polygon intersection/union gives **intertrace IoU 0.97918024**; a densified boundary Hausdorff calculation gives **1901.34 m**. This compares two manual digitizations of one source, not an ABO prediction. The symmetric difference is **181.95 km²**, and enclosed-area difference is **16.19 km² (0.1872%)**. No area was adjusted to the published narrative 8605 km² or Table 3 3864.89 km²; that discrepancy remains unresolved.

Clipping each projected trace to the fixed ±100 km square retains **8209.79 / 8234.15 km²**, excluding **4.9805% / 4.8768%** of its complete projected area. Geodesic areas and projected/clipped areas are distinct quantities. The science trace control RMSE is **108.09 m**, with a 2-pixel reading bound of **554.42 m**; the independent trace's separately defined reading-plus-quantization bound is **982.82 m**. These bounds are not additive predictive tolerances. Intertrace disagreement and control residuals omit original measurement, interpolation, erosion, crowdsourcing and event-window error. Both traces belong to one `taal-deposit-study` family and provide **zero independent thickness observations**.

The catalog and historical response carry both `reference_footprints`, a compatibility primary `reference_footprint_geojson`, and `footprint_evidence`. Source-blocked responses expose reference evidence without a fabricated simulation or model IoU. Raw PNG/JPEG/PDF/XML signatures and publisher metadata digests are checked; SHA-256 hashes cover sources and derived artifacts. See `data/source/taal-study/manifest.json` and `trace-comparison.json`.

When independently reviewed historical physical inputs become available, the evaluator reports each configured 0.5 mm trace as `footprint_iou_trace_1`, `footprint_iou_trace_2`, alongside the compatibility primary `footprint_iou`. Trace ordering is retained in `reference_footprints`. Neither trace yields independent point residuals. Until then these metrics remain absent/unavailable, with no prediction inferred from digitization repeatability.

The [2020 Taal deposit study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8889389/) reports plume heights above sea level and changing deposit patterns. Its source facts do not supply every required effective model parameter. If historical inputs or independent observations are missing, the endpoint returns unavailable, blockers and reference tables, without a fabricated fit. No response implies PHIVOLCS approval or historical predictive validation.
