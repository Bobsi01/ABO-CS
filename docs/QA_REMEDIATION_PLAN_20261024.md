# Data/UI realism remediation plan

Branch: `codex/data-ui-realism-remediation`, based on `175d898`.
Scope: all ten findings in `QA_DATA_UI_REALISM_20261024.md`.

## Implementation sequence and acceptance criteria

1. **Scientific inputs and provenance (findings 1, 5, 9, 10).** Render the existing catalog source registry, correct scenario names, expose assumed umbrella coefficients and active weighting/transport assumptions, and version the changed dataset/solver. Keep empirical validation explicitly unavailable until independent evidence exists. Preserve preset numerical values unless fixing a demonstrated calculation bug.
2. **Numerical correctness (finding 6).** Integrate constant endpoint wind below the first supplied altitude. Verify constant profiles above/below their first and last levels, changing profiles, and existing scenarios. Audit shared use by simulation, sequences and sweeps.
3. **Geographic integrity (findings 3, 7).** Replace unsafe name-only provincial assignments with source polygon containment or reviewed receptor identities; preserve unresolved features as unknown. Regenerate derived municipal/provincial assets. Remove browser-side approximate numerical fallback and label missing receptor coverage visibly. Prevent same-name cross-province matches.
4. **UI result semantics (findings 2, 4, 8).** Use the actual snapshot at index zero; label active profile winds and inactive scalar controls; replace damage-like severity and unsupported family counts with deposit bands and indicative population. Keep eventual tables/exports explicit and preserve unknown values.
5. **Verification.** Run backend/frontend suites, API type regeneration/drift review, all-preset mass/replay probes, and browser checks at desktop/390/320 widths in light/dark themes. Add meaningful regression cases for numerical and data/UI failures.
6. **Independent QA.** Spawn a separate QA agent after implementation. It must independently inspect changes, test all ten finding closures, exercise the browser, and write its own report. Address defects it finds, then rerun affected checks.

## Impact boundaries

`kernel` and `service.sources` feed simulation, finite-pulse replay and wind sweeps. Shared provenance and generated API consumers must agree. Catalog identity/name changes affect preset selectors, tests and curation scripts. Boundary assets feed both the choropleth and dissolved province labels. Snapshot consumers include the 3D HUD, map, dashboard and accumulation chart. Population summaries must retain selected census years and unknown counts.

No destructive Git operations, file deletion, publication or deployment are part of this plan. Preserve the original audit artifacts. The final handoff will distinguish fixed implementation defects from unresolved empirical-validation limits.

## Progress

- [x] Inspect state, instructions, architecture and existing design approval.
- [x] Create remediation branch and record reviewable plan.
- [x] Implement numerical/provenance/data fixes.
- [x] Implement shared UI semantics.
- [x] Complete local regression and browser checks.
- [x] Complete independent QA and any retests.

Final evidence: [implementation results](QA_REMEDIATION_RESULTS_20261024.md) and
[independent QA report](QA_INDEPENDENT_REMEDIATION_20261024.md). The independent
review found no blocking correctness defects. Its accessibility follow-up led to
explicit group/region roles, followed by a fresh build and independent rescan.
