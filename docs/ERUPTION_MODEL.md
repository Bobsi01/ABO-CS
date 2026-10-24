# Finite-duration eruption sequence and lava teaching model

As of 24 October 2026, baseline and optional umbrella branches have different release
weights and spatial kernels; see [current computation distinctions](COMPUTATION.md#current-branch-distinctions--24-october-2026).
The two-component umbrella option prescribes final Gaussian spreads and a stationary
40% proximal mass fraction. Visible parcels/billows use schematic spreads; their edges
and opacity do not quantitatively reproduce that final deposit kernel or solve physical
umbrella expansion. Timeline Before/0 h now displays the zero-deposit first snapshot,
with eventual table/export totals separately labeled. The replay horizon includes the
post-emission settling tail and is not the duration of eruptive activity.

Implemented 2026-10-10 in `backend/src/abo_api/eruption.py`, through `POST /api/eruption-sequences`. `contracts.py` defines inputs and responses; generated OpenAPI supplies the TypeScript boundary. This is an educational finite-source extension of the existing analytical ashfall model. Plume formation, fountain geometry and hot/cool colors are schematic. No eruption-column CFD, gas chemistry, pyroclastic density current, lahar, rainfall or thermal lava solver is implemented.

## Ash before, during and after emission

Let the eruption emit modeled ash at constant rate Q kg/s between time 0 and T seconds. For each grain/release-height component k, keep the settling time tau_k, final mass W_k, Gaussian mean and variance from `COMPUTATION.md`. These are independent of the observation clock t.

The mass that has reached the flat model ground by t is

`A_k(t) = W_k * clip((t - tau_k) / T, 0, 1)`.

This follows by integrating constant emission times b that satisfy both `0 <= b <= T` and `b + tau_k <= t`. It inserts material instantly at its prescribed release height. The illustrated rise speed does not delay this numerical release or change deposition. Do not interpret the column animation as a solved buoyant ascent.

Use A_k(t) instead of W_k in the exact cell-probability integration and point evaluation described in `COMPUTATION.md`. The time-dependent ground load has units kg/m²; thickness remains `1000 * load / bulk_density` mm. Accumulation is monotone at every point. At `T + max(tau_k)` over **all** grain classes and height layers, it equals the eventual solver.

Mass accounting at each time:

- Emitted: `Q * min(t, T)` kg.
- Deposited on the infinite plane: `sum(A_k(t))` kg.
- Still aloft: emitted minus deposited.
- Inside domain: exact integrated cell mass.
- Outside domain: deposited minus inside; material still aloft is not domain loss.

The teaching default lasts 60 min. Its slowest class/layer settles in 96,875 s, so eventual deposition is reached at 100,475 s (about 1,674.6 min), rather than when emission ends. This example uses assumed physical values, not observed Taal inputs. The small prescribed fountain is enlarged 4× in the scene, with 100 m display fragments, solely for legibility; Python coordinates are unchanged and no ballistic exposure footprint is inferred.

The default response has 37 snapshots, bounded to 25–49. Formation, continuing emission and the early fallout tail get more samples; the tail uses exponential spacing and includes the exact final arrival time. A request whose extreme height/duration/settling-time ratio collapses these times at floating-point resolution is rejected with HTTP 422 before frame arrays are allocated; settling times are not artificially increased. Replay compresses these nonuniform steps into 36 display seconds and starts paused. The displayed physical time describes the selected snapshot; it is not the wall-clock replay speed or a historical reenactment. The 3D illustration interpolates between supplied snapshots for smooth motion, while quantitative map layers and their explicit snapshot label retain the preceding computed frame.

## Grids, contours and receptor states

Contours use the submitted native grid (normally 200 × 200 cells at 1 km). Each scene snapshot also includes at most a 50 × 50 grid, integrated analytically at that coarser cell size, for an optional detached deposition plane. `final_grid` retains the native eventual result. The scene grid and native contours differ in averaging resolution, not in model or units. Their integrated mass agrees.

Receptor load, thickness, reporting flag and available screening criteria are evaluated at each snapshot. Outside-domain receptors remain unknown. The reporting threshold is 0.5 mm, not a damage criterion. The folded exposure table and CSV retain explicitly labeled **eventual** totals; the map inspector uses the selected clock. Neither is an estimate of every resident or building in a municipality.

## Visible plume parcels

For a component with fall time tau, airborne material at time t has ages between `max(0, t - T)` and `min(t, tau)`. Divide this age interval into six equal bins, representing each by its midpoint age a. Its bin mass is `Q * grain_fraction / release_layers * interval_width / 6`.

Python supplies E/N centers `(uE*a, uN*a)`, height `release_height - settling_speed*a`, and horizontal spread `sqrt(sigma0² + 2*K*a)`. Summing all bin masses equals still-aloft model mass. Stable IDs identify component/quantile slots, **not individual particles**; interpolation is visual and does not solve new physics.

React renders these centers as enlarged gray billows, with opacity and vertical shape chosen for readability. A white source stem illustrates condensed steam within the mixed ash/gas plume. Gas concentration, condensation, turbulence, neutral-buoyancy height and umbrella spreading are not calculated. Source-column rise speed defaults to a prescribed 30 m/s and is explicitly an illustration input. Q=0 produces no ash plume, deposit or fountain.

## Fountain distinction

Taal teaching scenes include four prescribed short arcs and moving fragments while emission is active. Python uses a six-second flight, 12 m/s horizontal display speed and g=9.80665 m/s². These values define a schematic mechanism, not observed 2020 trajectories or a ballistic hazard range. The 2020 record supports illustrating **lava fountaining**; it does not justify adding a regional effusive lava flow to Taal. Kanlaon's explosive teaching scenario also has no default effusive flow.

## Optional lava channel

The Mayon teaching scenario can enable a separate lava demonstration. It uses the packaged **raw**, unexaggerated elevation grid (250 m sampling), with matching geographic origin. Its inputs are independent of ash rate and deposit density:

| Input | Teaching default | Unit |
| --- | ---: | --- |
| Lava effusion q | 5 | m³/s |
| Channel width w | 20 | m |
| Dynamic viscosity mu | 1,000 | Pa·s |
| Lava density rho | 2,600 | kg/m³ |
| Route limit | 20,000 | m |

These are **assumptions**, not measured Mayon material properties. The model is laminar, Newtonian, steady within one channel and isothermal. The Jeffreys mean-speed relation is `v = rho*g*h²*sin(alpha)/(3*mu)`. Using `q = w*h*v` gives

`h = (3*mu*q / (rho*g*w*sin(alpha)))^(1/3)` and `v = q/(w*h)`.

h is flow depth normal to the inclined channel in metres, v is mean speed **along the slope** in m/s, alpha is ground-slope angle. Do not substitute a surface-speed formula with denominator 2 for this mean velocity. The cited analog-flow paper supports this relation and its assumptions; it does not validate ABO's route on Mayon.

The D8 graph chooses the steepest positive drop per horizontal neighbour distance; diagonal steps use their actual longer distance. `sin(alpha) = slope / sqrt(1+slope²)`. Travel time is `sqrt(delta_E² + delta_N² + delta_z²) / v`, using the inclined segment length. Channel volume is width × normal depth × inclined length. The engineering distance cap uses cumulative **horizontal** route length; it is not a radial danger zone. Routing stops at a pit/flat, water, asset edge, the declared distance limit or the duration/volume limit. A partial final segment is retained. At a duration-limited stop, channel volume sums to `q*T`. Terrain is never modified; lava does not branch or fill depressions.

At each ash clock, Python clips the reached lava route by its supplied arrival times, buffers it by half the prescribed width and intersects that geometry with receptor points. The map uses these current-time polygons and IDs. Its centerline is enlarged for visibility; the polygon uses the prescribed width. The 3D ribbon uses at least 130 m visual width, with explicit labeling, and anchors to absolute raw terrain elevation. The close-up faces the routed slope so the cone does not hide the channel. Hot/cool colors are stage cues, not predicted temperatures or cooling duration.

A stopped route means **unknown continuation**. Constant viscosity without cooling, crystallization, yield strength, branching, ponding and surface evolution cannot establish real runout or inundation safety. The assumed channel footprint is not a PHIVOLCS hazard map.

## Resource bounds and verification

Before allocating frame tensors, the backend estimates working memory including full frame grids, temporaries, parcel arrays and a serialization allowance, and rejects requests beyond 512 MiB. Arrays reduce `[time, component, north, east]` through NumPy/einsum; there is no Python cell/grain solver loop. Bounded frame/receptor serialization is separate. Lava uses a vectorized neighbour graph and SciPy traversal. Its local terrain intake requires finite, increasing, uniformly spaced axes with 2–401 samples each, matching finite elevation/mask matrices and mask values 0 (sea), 1 (land) or 2 (lake). Invalid local assets fail with HTTP 422 rather than routing with incorrect neighbour distances or exposing an array-index error.

Independent checks in `qa/test_eruption_audit.py` compare every synthetic grid cell and receptor against scalar normal-CDF references; test closure, monotonicity, full-mixture final timing, zero mass, cardinal transport and visual-rise independence; and examine raw-DEM routing, diagonal distances, discharge, source mismatch, stops and admission bounds. Integration-specific tests in `backend/tests/test_eruption_sequence.py` cover timed lava intersections. UI/API checks do not establish historical agreement.

See [research registry](ERUPTION_RESEARCH.md), [independent QA](ERUPTION_QA.md), [input dictionary](INPUT_VALUES.md) and [existing calculation](COMPUTATION.md). No historical predictive validation is claimed.

## Reproduce a saved teaching request

With the local server running, from the repository root in PowerShell:

```powershell
$eruptionRequest = Get-Content -Raw -LiteralPath './data/examples/mayon-eruption-request.json'
$eruptionResult = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/api/eruption-sequences' -ContentType 'application/json' -Body $eruptionRequest
$eruptionResult.frames[-1].diagnostics
```

The saved request uses assumed teaching values, not Mayon measurements. A UI Scenario JSON export contains `scenario`, expanded `eruption_options` and provenance; submit `{simulation: {scenario: exported.scenario}, options: exported.eruption_options}` to the same endpoint. Keep the recorded dataset revision and bundled terrain files to reproduce receptor and channel results. Final CSV contains eventual ash results, not the currently selected snapshot or a lava damage inventory.
