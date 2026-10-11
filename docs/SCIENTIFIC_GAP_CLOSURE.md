# Scientific gap-closure evidence — 11 October 2026

The numerical and scientific-data implementation is verified within its reduced assumptions. **Historical Taal validation is not established.** No historical run was fabricated to fill missing inputs. Methodological approval, input availability, digitization repeatability and prediction accuracy remain separate.

## Delivered implementation

- Python-authoritative additive contracts expose parameter evidence, census-year records, applicability conditions/reasons, protocol/dependency identity, per-observation residuals and both derived reference footprints.
- Conditional roof/crop screening requires a matching local reviewed criterion, receptor type and stated conditions. A caller's review flag cannot certify a criterion. Missing applicability remains unknown and does not contribute to threshold counts.
- Catalog populations select the requested census year; missing 2020 counts do not fall back to 2024. Historical evaluation selects 2020. Current/correspondence codes are preserved without asserting historical boundary continuity.
- Frozen IGRA processing preserves raw data and processing flags, converts speed units and FROM bearings, consolidates duplicate heights and interpolates vectors without extrapolation. Source-blocked effective winds have null speed, bearing and vectors.
- Point comparison distinguishes signed interval and midpoint residuals and reports interval and midpoint errors separately. Compatibility `rmse_mm` is interval-distance RMSE. Outside-domain observations have null predictions/residuals and explicit exclusion reasons.
- A future reviewed-input comparison can report each reference trace separately; no model IoU is computed while historical inputs are blocked. Source-blocked responses still expose both reference geometries and their descriptive provenance.

## Curated evidence and remaining blocks

| Evidence | Result |
| --- | --- |
| Frozen event | 12 January 2020 13:00 to 13 January 04:28 local UTC+8; 55,680 s; endpoint definitions retained separately |
| Tanay soundings | Actual 00:11 and 11:40 UTC launches, nine usable levels each, 15/21 frozen grid heights (71.43%); below the predeclared 75% gate |
| Published source | Actual NIH PMC PDF/XML/JPEG and metadata archived; publisher MD5 and local SHA-256 checked; rejected HTML acquisition kept separate |
| Derived contour areas | WGS84 geodesic 8639.9502 / 8656.1410 km²; neither adjusted to a published area |
| Digitization repeatability | Vent-centered projected IoU 0.97918024; densified boundary Hausdorff 1901.34 m; not model agreement |
| Domain clipping | Retained projected areas 8209.79 / 8234.15 km²; omitted fractions 4.9805% / 4.8768% |
| Source dependence | Both traces share one deposit-study family; zero independent point observations |
| Current inventory | 318 municipality/city records with reviewed 2024 code/population pairs, plus two airports |
| Domain inventory | Taal 162/214, Mayon 37/112, Kanlaon 109/171 included; 308 unique included intersecting receptors and ten retained legacy records outside all domains |
| Historical census | 34 Batangas 2020 counts accepted; 284 other municipal/city historical counts unavailable |
| Roof/crop/water | No unsupported damage threshold or water-facility coordinate promoted; source investigation and acquisition limits recorded |

Historical active-vent datum, independent ash mass/density, whole-event grains/settling, effective event wind, raw thickness observations and defensible original observation/predictive uncertainty remain incomplete. Narrative 8605 km² and Table 3 3864.89 km² are distinct unresolved statements. Independent original uncertainty cannot be replaced by control residuals or intertrace differences.

The local release-height approximation also remains visible: at the saved synthetic 50 km northeast teaching point, 8/16/32 layers give 0.04111437 / 0.02690953 / 0.03182800 mm. The 16-to-32 change is 18.28%; stable integrated mass does not establish local point convergence. Sixteen layers remain the approved engineering default.

## Verification and reproduction

From `backend/`, the following completed successfully:

```powershell
uv run python ../scripts/curate_taal_contours.py
uv run python ../scripts/build_catalog.py
uv run python ../scripts/build_parameter_register.py
uv run python ../scripts/export_gap_evidence.py
uv run pytest tests ../qa/test_independent.py ../qa/test_further_scientific_qa.py ../qa/test_eruption_audit.py ../qa/gap_closure/test_independent_gap_science.py -o addopts= --disable-warnings
```

**142 Python cases passed in 6.76 s**, including 12 new owned source/readiness cases and 23 independent gap-science cases. Ruff checking and format checking passed for owned backend files and scientific scripts. These cases verify numerical/software behavior and evidence integrity, not empirical prediction accuracy.

Independent QA reconstructed both source traces, reproduced geodesic/projected comparisons, verified publisher/local digests, audited all 318 current code/population pairs and checked domain inventory arithmetic. Its evidence remains separately owned under `qa/gap_closure/`, including `independent-source-trace.json`, `independent-inventory.json`, `independent-igra.json` and the scalar test fixture.

The reproducible source-blocked response is saved as `data/examples/taal-evidence-status.json`, with catalog SHA-256. Input fixtures in `data/examples/*-teaching.json` remain illustrative simulation requests. Manifests are `data/source/gap-curation-manifest.json`, `data/source/igra/manifest.json`, `data/source/taal-study/manifest.json` and the original `data/source/manifest.json`. Investigated source exclusions are recorded in `data/source/source-investigations.json`.

See [EVALUATION_PROTOCOL.md](EVALUATION_PROTOCOL.md), [PARAMETER_REGISTER.md](PARAMETER_REGISTER.md), [INPUT_VALUES.md](INPUT_VALUES.md) and [COMPUTATION.md](COMPUTATION.md). Browser, performance, accessibility and manuscript evidence are recorded separately by their implementation and QA owners.
