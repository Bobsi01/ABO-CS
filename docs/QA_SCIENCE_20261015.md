# Independent scientific/backend QA, 15 October 2026

Evaluated the newly pulled `dc13dbe` against the proposal snapshot, project context,
repository map, and the numerical, Python/React and QA skills. This is an independent
review: this evaluator authored synthetic defect fixtures and evidence only; production
corrections belong to the orchestrator. Historical predictive accuracy remains unestablished.

## Executed evidence

- `uv run --project backend pytest backend/tests qa -q` completed with exit 0 before
  adding the counterexamples: 191 cases (progress at 37%, 75%, 100%). This includes
  scalar kernel/projection tests, census/source evidence, finite-source and lava tests,
  API error/resource handling, and Taal file/hash/sync checks.
- `uv run --project backend pytest qa/review_20261015/science/test_extension_counterexamples.py -q`
  initially failed all three new cases in 1.98 seconds.
- Ruff lint and formatting pass for the new fixture.
- No numerical data was edited by this evaluator. No empirical prediction was fitted.

## Confirmed defects at the pulled commit

| ID | Priority | Evidence | Required correction |
| --- | --- | --- | --- |
| SCI-01 | P1 | `eruption.sequence()` computes deposited mass from pulse timing but emitted mass as average scenario rate times elapsed. Synthetic front-loaded pulse at 0.0416667 s reports 4.16667 kg emitted instead of 41.6667 kg. Later deposition can exceed the reported emitted mass; clipping airborne mass to zero hides the conservation error. | Integrate each pulse rate over its actual active elapsed interval. Preserve emitted = deposited + airborne in every frame. |
| SCI-02 | P1 | A single pulse starting at 900 s creates nonzero airborne parcels at 0.0416667 s. `airborne_parcels()` receives scenario-average rate/duration/maximum height and one midpoint wind; it ignores actual pulse starts/heights/rates and profile component winds. | Derive parcels from the same per-component source/timing/winds as deposition. Avoid showing source activity before the pulse. |
| SCI-03 | P1 | `service.sweep()` always uses `scenario.wind_speed_m_s`, ignoring submitted profiles even though its provenance claims profile winds apply. Synthetic uniform speed 0 / profile speed 100 m/s produces fixed simulation 7.7548583363216e-5 kg/m2, but alleged maximum 1.7078986139566308e-38 kg/m2 at the same receptor. | Implement a clearly defined bounded profile-rotation sweep or reject the unsupported combination explicitly. |
| SCI-04 | P1 | Curated Bato data and 3D caption claim dike length 5 km. The cited paper page 8, section 5 reports a 21 by 8 km near-vertical dike extending southwest. The same file claims subsidence continues to 2021 although the paper's post-eruptive study period ends June 2020. | Correct with exact source/page and uncertainty or withhold unsupported quantities. Update aliases, public asset, curation script, manifest, and captions together. |
| SCI-05 | P1 | `taal_tropomi_july2021.json` calls 225 degrees, 85 km, 112 DU an empirical satellite observation. The only locator is the Copernicus homepage; the curation script writes literal constants. No product granule, orbit/time, retrieval altitude/QA selection, archived source pixels, or numeric derivation supports these values. | Retain missing/unreviewed status and withhold the quantitative observed vector until traceable local evidence exists. A non-model disclaimer does not establish observation authenticity. |
| SCI-06 | P2 | `curate_earthquakes()` invents three representative events with USGS attribution if the CSV is absent. Current packaged 49-event JSON uses the real CSV, so the current runtime data is not this fallback. | Fail closed on absent CSV. Synthetic fixtures must remain separate and explicitly synthetic. |
| SCI-07 | P2 | The PDZ polygon is extracted from an OSM lake-hole shoreline and simplified by 0.0001 degrees, but the 3D caption calls it an official PHIVOLCS boundary. The map's explanatory text correctly calls it an OSM approximation. | Harmonize data/caption provenance and preserve OSM attribution; no official hazard GIS geometry is established. |
| SCI-08 | P2 | A follow-up unequal-height pulse fixture found the visible column still used the maximum scenario height and absolute elapsed time: a 50 m first pulse reached a displayed 62.5 m at 2.0833 seconds because a later pulse had a 100 m column. | Use active pulse heights and elapsed time relative to each pulse start for the prescribed rise. |

## Primary-source verification

An author-institution repository provides the complete peer-reviewed paper:
[Bato et al. 2021, GRL, DOI 10.1029/2021GL092803](https://horizon.documentation.ird.fr/exl-doc/pleins_textes/2021-06/010081426.pdf).
The exact downloaded PDF is `qa/review_20261015/science/bato2021-primary.pdf`, SHA256
`4c96830465928b5c742ec8a175233ee70bb5ab96ea9b5d9da28f22e179ce9c0e`.
Page 8, section 5: "a 21 × 8 km, near-vertical, NE-striking dike".
Its southwest propagation supports the arrow's general direction, but the repository's
exact 225-degree azimuth needs classification as a schematic directional approximation
rather than an independently verified inversion parameter. Page 4, section 2.1.3 bounds
the analyzed post-eruptive data to January–June 2020. Figure/citation headers identify
the work, authors and DOI. This review does not reproduce the geodetic inversion.

PDZ trace: `curate_pdz()` loads `frontend/public/geography-context.geojson`, takes a
Taal lake interior ring, then applies topology-preserving simplification. The existing
`docs/GEOGRAPHY_REFERENCES.md` traces that shoreline to OpenStreetMap relation 270582,
version 46. The PHIVOLCS policy that Volcano Island is a danger zone does not make this
derived shoreline an official PHIVOLCS surveyed boundary.

The activity/timeline logs also use literal numeric observations without archived
bulletin/page locators. Those values were not individually verified here; do not interpret
the earlier checksum-only Taal audit as a transcription/source-validity pass. Exact
TROPOMI numerical values remain source blocked, not proven false by this review.

## Evidence limits

Existing tests provide meaningful numerical/software evidence but missed unequal-rate,
delayed-source and profile-sweep counterexamples. Source hashes prove byte integrity,
not truth or scientific review. This evaluator did not inspect native Word accessibility,
all manuscript pages, GPU cleanup/soak, or every historical bulletin. The model retains
flat ash ground, constant class settling, finite release-height quadrature and illustrative
physical inputs. Profile winds are sampled at release height and held along each fall;
this is a reduced transport assumption, not resolved vertical wind trajectory integration.

## Independent correction retest

After the orchestrator's backend corrections, all five independent extension cases pass
in 1.33 seconds. The original three reproductions now pass. Two stronger cases verify
the complete 360-angle sheared-profile maximum and returned bearing against a separate
scalar computation, and verify every frame of an unequal-rate/unequal-height pulse
scenario with profile winds: parcel mass sums to airborne mass, emitted equals deposited
plus airborne, and the column is absent during the inter-pulse gap. These retests close
SCI-01 through SCI-03 for the tested cases. They do not establish overall historical
accuracy or source validity.

The requested follow-up independently found and reproduced SCI-08; the orchestrator
corrected it, and its new pulse-relative-column regression passes. Final focused evidence
is **19 passed in 1.65 seconds**, across nine numerical/sequence/sweep cases and ten
curation/provenance cases. Ruff lint and formatting pass for both fixture modules.

The curation safety fixture executes the entire current curation script into isolated
temporary directories using the archived USGS CSV and existing local geography. Every
rebuilt source and public asset matches its packaged counterpart byte-for-byte, including
manifest hashes and lengths. A missing CSV raises without writing fabricated observations.
The Bato 21 by 8 km geometry matches the exact archived primary PDF hash and page locator;
unsupported uplift/subsidence values are null and the 225-degree heading is labeled
schematic. TROPOMI numeric observations are null/source-blocked; activity, timeline,
WOVOdat and HDX records explicitly retain source-blocked status. The shoreline metadata
identifies OpenStreetMap and approximate context. These checks close the concrete
software/provenance presentation defects SCI-04 through SCI-07; missing external evidence
remains unresolved, and source-blocked records have not become verified observations.

Additional bounded-sweep cases observe that all 360 candidate directions are evaluated
in batches of at most sixteen for both uniform/profile modes, confirm out-of-domain
loads and directions remain unknown, preserve the calm-wind earliest-bearing convention,
and accept empty custom receptor lists. The scalar sheared-profile test independently
checks mathematical maxima and bearing rather than merely checking batch plumbing.

The final browser presentation is reviewed separately by the parent/UI evaluator;
this independent report certifies the backend and local-data checks described here.

## Follow-up requested fix pass

The independent evaluator found two further edge defects: profile-rotation roundoff
invented a preferred bearing at an isotropic vent, and a short active pulse entirely
between existing snapshots never displayed a column/fountain. The owner corrected
profile evaluation with receptor-frame rotation and added pulse-aware snapshot anchors.
Both independent regressions pass; the focused suite now passes **21 cases in 3.12 s**.
The separate [remaining-gate assessment](../qa/review_20261015/science/remaining_gate_assessment.md)
and scalar `convergence_probe.py` retain numerical-only evidence: at the recorded Mayon
50 km NE receptor, 16/32 layers differ from adaptive reference by 10.28%/6.118%.
Those convergence and missing-source gates are not closed by software corrections.
