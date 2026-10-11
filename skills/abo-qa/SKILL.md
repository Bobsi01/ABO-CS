---
name: abo-qa
description: Evaluate ABO's development foundation, skill usefulness, numerical evidence, and simulator user workflows. Use when project QA is requested; separate runnable setup from validated science.
---

# ABO QA

Read the proposal snapshot, context, repository map, and the skill relevant to the task. Report the concrete artifact, check, observed result, and confidence limit. Fixes require the normal repository impact check; an independent evaluator should report findings without changing the implementation under evaluation.

For skill usefulness, use realistic requests or artifacts and observe decisions. YAML validation proves structure only. A skill that identifies a genuine modeling/contract/design defect has demonstrated usefulness for that case; do not generalize one case into proven scientific accuracy or production readiness. Record cases without prior author hints, unused skills as untested, and counterexamples or scope conflicts.

For the foundation, reproduce locked installs and documented commands, verify both success and failure of the React-to-Python connection, inspect OpenAPI type generation, and check that CI runs the same local gates. A health endpoint is not simulation proof.

For numerical changes, inspect equations/provenance, units, cardinal wind orientation, finite/nonnegative values, grain fractions, vent/upwind treatment, zero mass, finite-domain mass accounting, resolution sensitivity, municipality boundaries, duplicate populations, overlapping thresholds, out-of-domain coverage, and resource bounds. Use independent expectations and synthetic fixtures clearly identified as tests.

For a simulator UI, trace real input through backend computation to contours/table/counts. Verify all interactive elements, keyboard/focus, readable units, contrast, narrow screens, loading/empty/failure states, and local anti-slop gates. An airport marker inside a deposited-ash contour is not an airborne hazard assessment. Historical replication needs independent observations, metrics, tolerances, and disclosed calibration.

Write scope, evidence, findings, and remaining gaps in the QA report. Avoid declaring all features tested when only tooling or the starter screen exists.

For the approved 3D scope, verify world wind orientation, representative grain travel, matching map/table outputs, stale-result handling, camera/replay controls, hidden/reduced-motion pauses, WebGL fallback and graphics disposal. Record machine, rendering mode and measured frame rate; do not infer GPU performance from numerical timing. Inspect both themes and 320 px layout. QA may author defect fixtures; implementation owners fix reported defects. Three specialists plus the orchestrator is the authorized team limit.
