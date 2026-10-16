# Independent remaining-gate assessment, 15 October 2026

Reviewed the current comprehensive and scientific QA reports and corrective working tree.
No production module was changed by this evaluator. The user authorized fixing confirmed
software issues, but missing measurements cannot be replaced by synthetic evidence.

## Additional actionable software findings

- Profile sweep isotropic-vent tie: rotating each wind vector introduced norm roundoff,
  inventing a preferred bearing (2 degrees in the reproduced constant-profile fixture).
  The implementation owner changed to receptor-frame rotation. The independent tie and
  scalar sheared-profile regressions now pass on that correction.
- Pulse snapshot timing: a legal 450–451 s active pulse and 999–1000 s zero-rate envelope
  pulse produces snapshots at 400.2 and 500.167 s with no active-source frame. The complete
  eruption column/fountain is omitted despite positive emitted mass. Independent regression
  `test_short_interior_pulse_is_represented_in_sequence_snapshots` reproduces the issue.
  Include pulse starts/interiors/endpoints in bounded snapshot selection, preserving the
  final fully deposited endpoint and clear representability errors. Eight pulses imply at
  most 24 start/interior/end anchors plus the final endpoint before deduplication; a fixed
  25-frame request needs deliberate prioritization of shared/zero-rate boundaries.

Correction retest: the implementation owner added pulse-aware timeline anchors. The short
interior-pulse regression now passes together with the profile-vent tie and all prior
scientific/curation cases: **21 passed in 3.12 seconds**. Ruff lint and formatting pass.

## Numerical convergence evidence

`convergence_probe.py` independently integrates the scalar continuous-release-height
Gaussian density with SciPy adaptive quadrature, 64 explicit initial height subintervals,
and strict local tolerances. It compares midpoint samples using the existing pure kernel;
the extra 64–512 midpoint counts are QA-only and do not change the API's maximum 32 layers.
`convergence_probe.json` contains exact scenario parameters, coordinate, method outputs.

At the existing Mayon teaching scenario's receptor 50 km northeast, the adaptive reference
is **0.029993051911690365 mm** with a reported integration error estimate of 9.75e-16 mm.
Relative midpoint errors at 8/16/32/64/128/256/512 layers are approximately
37.08% / 10.28% / 6.118% / 1.362% / 0.6249% / 0.004254% / 0.0000000573%.
Thus exact Gaussian cell integration and domain mass accounting do not close the local
release-height convergence gate. A source-height quadrature limitation remains at the
public 16-layer default and 32-layer maximum. This is numerical approximation evidence,
not physical model error, empirical uncertainty, or historical predictive accuracy.

Recommended scoped response: disclose the finite-layer limitation in per-result assumptions,
retain this reproducible sensitivity evidence, and plan a separately reviewed opt-in
refinement/reference method with feature-resolution guards and bounded resources. Do not
restore discarded accuracy-mode code or claim 16-vs-32 agreement alone proves convergence.
The scalar probe covers the one declared teaching case, not every receptor/profile/pulse.

## Source gates that local evidence cannot close

- Historical plume winds: both archived Tanay profiles cover 15/21 protocol heights, below
  the frozen 75% gate. Reusing held endpoint winds from the optional profile solver does
  not repair missing historical measurements or authorize protocol relaxation.
- Taal historical mass, density, emitted grain distribution and active-vent datum remain
  independently source-blocked. A contour does not separately identify mass and density.
- Activity/timeline, station/network and HDX draft metadata now clearly retain blocked
  status. Exact archived bulletin pages, source identities/locators and per-value review
  are required before these become observations. No new authoritative source snapshots
  were present in this corrective diff to close those gates.
- TROPOMI quantitative values are withheld correctly; a local retrieval artifact with orbit,
  time, product identity, quality handling and derivation must precede a quantitative cue.
- Bato 21 by 8 km geometry is locally source-verifiable from the archived primary paper;
  the schematic 225-degree heading and display placement must remain qualified.
- PDZ OSM shoreline approximation is traceable and useful display context, but does not
  become official hazard GIS. Complete municipal coverage and missing historical census
  records require actual archived primary records/crosswalk review.

No additional local hash, test, generated schema or screenshot can establish those missing
scientific inputs. Keep source readiness, numerical correctness and historical agreement
as separate statuses while correcting the actionable software defects.
