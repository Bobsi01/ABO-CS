---
name: abo-numerical-modeling
description: Specify, implement, or review ABO's vectorized ashfall model, geographic sampling, impact criteria, or Taal replication. Use for scientific computation and manual input provenance, not ordinary frontend setup.
---

# ABO numerical modeling

Read `PROJECT_CONTEXT.md`, `data/README.md`, and the relevant architecture section through the repository map. Distinguish proposal requirements from engineering assumptions. Numerical invariants do not establish historical accuracy.

- Select a cited deposition formulation and show units before implementing it. A Gaussian airborne concentration multiplied by eruption duration is not automatically deposit mass per area. Identify release height, deposition/settling treatment, dispersion parameters, and finite-domain losses.
- Compute in a documented local metric coordinate system. Longitude/latitude remain geographic inputs, ordered explicitly; never use degrees as meters. For pyproj transforms use deliberate axis ordering, such as `always_xy=True`, and test round trips and known cardinal offsets.
- Meteorological bearings describe wind FROM clockwise from north; transport points in the opposite direction. Test north/east/south/west winds before adding presets.
- Use NumPy broadcasting, array operations, and reductions across grain classes. Document axes such as `[grain, northing, easting]`. `numpy.vectorize` and Python cell/grain iteration do not meet the proposal's loop-free kernel objective. Data-loading and bounded scenario orchestration are separate from the kernel; clarify course expectations for the sweep before implementation.
- Bound memory for grain/grid/direction tensors before allocation. A full 360-direction cube is not required to find municipal maxima. Handle the vent, upwind cells, zero eruption mass, small/zero wind, nonfinite values, and domain edges deliberately; do not hide invalid outputs with arbitrary clipping.
- Keep mass rate, duration, erupted mass, deposited load, bulk deposit density, and thickness dimensionally consistent. Grain fractions must sum to one. Derive conservation and grid-convergence checks from the chosen equations; inside-domain deposit cannot exceed available ash mass.
- Load scientific inputs only from manually curated local records with source and review metadata. Missing data stays missing. Do not supply plausible-looking volcano presets, populations, historical observations, settling velocities, or impact thresholds from memory.
- Municipality centroids are point samples. Mark outside-domain coverage separately; do not call it zero/safe. Explain indicative population counts and overlap across hazard criteria.
- Roof, crop, and water criteria may use different quantities and mechanisms. A surface-deposition map cannot establish airborne aviation safety; label any airport intersection as ground-footprint screening until a defensible airborne model exists.
- Replication requires independent historical observations and declared comparison metrics/tolerance. Matching broad provinces or tuning to the same observations does not establish predictive accuracy. Report sensitivity and explicit proposal limitations.

Use meaningful numerical tests and tiny clearly labeled synthetic fixtures. Report model assumptions, units, data provenance, observed evidence, and unresolved validation gaps with each scientific result.

The approved implementation permits visibly **illustrative teaching presets** in the application once the real solver is available. They must list their assumed physics, stay separate from reviewed sources, and never be called historical or validated. Missing scientific inputs cannot be silently replaced by teaching values. The approved sweep evaluates 360 directions directly at receptors. Three-dimensional scene geometry does not add numerical terrain, weather or airborne physics.

References for implementation mechanics: [NumPy broadcasting](https://numpy.org/doc/stable/user/basics.broadcasting.html), [numpy.vectorize limitations](https://numpy.org/doc/stable/reference/generated/numpy.vectorize.html), [pyproj Transformer](https://pyproj4.github.io/pyproj/stable/api/transformer.html). These references explain tools, not a validated ashfall model.
