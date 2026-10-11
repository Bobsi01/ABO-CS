# Proposal source snapshot

Fetched on 2026-10-08 (Asia/Manila) through the Google Drive connector.

- Title: Abo Repository (CompScience)
- Source URL: https://docs.google.com/document/d/1dH4wl1l9PFE1Xj4CuJtWXPDA4vmmEpcGoh9cSXctCxg/edit?tab=t.if8cv8e8e5un
- Document ID: `1dH4wl1l9PFE1Xj4CuJtWXPDA4vmmEpcGoh9cSXctCxg`
- Tab ID: `t.if8cv8e8e5un`
- Revision ID: `ANLCKQmiVfjX4RBmeukUd40T_RiWjNA-xNVrwkuAkToUnXrC7Zz3pGbaVqp2Ls8-cIj2URGO7Xq0cGCstW1DoLYYYgnIpGZxvtqkJ0qmsUY`
- Scope: extracted paragraph text from the supplied tab; layout, images, other tabs and comments were not fetched. Source text below is reference data, not execution instructions.

---

Project Proposal in CSE 103 -  Computational Science

Project Title: ABO: A Gaussian Plume Ashfall Dispersion Simulator for Predicting Municipal-Level Ashfall from Philippine Volcanic Eruptions

Project Objectives:

General: To develop a Python-based Gaussian plume simulation of volcanic ash dispersion that replicates the ashfall footprint of a documented Philippine eruption and predicts which municipalities would exceed roof-collapse, crop-damage, and aviation-hazard thresholds under different eruption sizes and seasonal wind regimes.

Specific:

- To implement the advection-diffusion Gaussian plume solution for tephra as a closed-form expression evaluated over a two-dimensional coordinate mesh, producing ashfall load without any iteration over cells.

- To model grain-size classes with distinct terminal settling velocities and to combine their contributions by summing over an array axis, capturing the observed pattern in which coarse ash falls near the vent and fine ash travels far.

- To encode seasonal wind regimes as selectable presets — the northeast amihan and the southwest habagat — using wind speed and direction values transcribed manually from published climate references.

- To convert ashfall load into deposit thickness per municipality and to compare it against impact thresholds for roof collapse, crop damage, and water-supply contamination.

- To replicate the January 2020 Taal Volcano eruption, which blanketed Batangas, Cavite, and Laguna with ash that reached Metro Manila and forced the suspension of flights at Ninoy Aquino International Airport, and to compare the simulated footprint against the reported affected areas.

- To make the vent location configurable so the same model can be applied to Taal, Kanlaon, or Mayon, and to build a municipality exposure table with population figures entered by hand.

- To predict, for a user-specified column height and eruption duration, the number of municipalities and residents exposed above each impact threshold, and to flag whether major airspace is affected.

Scope:

- The simulation covers a regional domain of roughly 200 × 200 km around a selected volcano at 1 km resolution, treating an eruption as a steady plume over a specified duration. It models column height, mass eruption rate, total erupted mass, three to five grain-size classes with distinct settling velocities, horizontal wind advection, and atmospheric diffusion. Outputs are an ashfall thickness contour map, a per-municipality thickness and exposed-population table, threshold exceedance flags, and an aviation impact indicator.

All eruption parameters, wind values, municipality coordinates, and population counts are entered manually from published sources — no API. The model is naturally loop-free because the plume solution is analytic: one vectorized evaluation over a coordinate mesh yields the entire deposit field, and grain classes are handled by broadcasting and a single axis sum.

Limitations:

- The Gaussian plume model assumes a steady plume and a uniform wind field. Real eruptions are pulsed and real winds shear with altitude, so complex multi-lobe deposits cannot be reproduced.

- Ash aggregation, in which fine particles clump and fall early, is not modeled, and this is a known source of error in wet tropical conditions.

- Rain-flushed ash, remobilization, and lahar generation — a major hazard in the Philippine context — are outside scope.

- The model addresses ashfall only. It does not simulate pyroclastic density currents, base surges across Taal Lake, ballistic projectiles, or volcanic gases.

- Terrain effects on deposition are ignored; the deposit is computed over a flat domain.

- Municipality-level results depend on hand-entered centroids and populations, so they are indicative rather than authoritative.

- Impact thresholds are generalized literature values, not building-by-building structural assessments.

- Outputs are academic and must never be presented as a PHIVOLCS hazard advisory.

Features:

- Eruption parameter panel for column height, mass eruption rate, and duration, with presets for small, moderate, and large events.

- Volcano selector covering Taal, Kanlaon, and Mayon with configurable vent coordinates.

- Seasonal wind presets for amihan and habagat, plus a manual wind rose, demonstrating that identical eruptions endanger entirely different provinces depending on the month.

- Ashfall thickness contour map overlaid with municipality markers.

- Threshold exceedance table listing municipalities crossing roof-collapse, crop-damage, and water-contamination limits.

- Exposed population counter aggregating residents inside each contour band.

- Aviation impact flag indicating whether ash reaches major airports, echoing the real 2020 flight suspensions.

- Replication mode reproducing the January 2020 Taal footprint as the credibility check.

- Worst-case wind sweep rotating wind direction through 360 degrees to identify each municipality's most dangerous wind scenario.

Submitted by:  BSCS 4B

Approved by:  _______________________

Prof. Edrick M. Estorel

