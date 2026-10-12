# Input values and source policy

The app runs with **illustrative teaching scenarios**. Their physical values are assumptions, not measured eruption or weather inputs. Source-reviewed geography does not upgrade physical assumptions to reviewed status.

## Added event and lava values

`POST /api/eruption-sequences` accepts the same ash scenario plus the following options. Defaults are educational assumptions, not inferred volcanic measurements. Lava is enabled only for the catalog Mayon terrain origin; Taal uses a schematic fountain and Kanlaon has no added lava channel.

| Option | Unit / default | Role and evidence |
| --- | --- | --- |
| `frame_count` | 37, allowed 25–49 | Engineering snapshot count |
| `plume_rise_speed_m_s` | 30 m/s | Prescribed display ascent only; no change to release or deposition |
| `include_lava` | false API default; Mayon UI preset true | Optional teaching model |
| `lava_effusion_m3_s` | 5 m³/s | Assumed discharge, not measured Mayon flux |
| `lava_width_m` | 20 m | Assumed channel/footprint width; 3D display minimum 130 m separately labeled |
| `lava_viscosity_pa_s` | 1000 Pa·s | Fixed assumed Newtonian viscosity, no temperature dependence |
| `lava_density_kg_m3` | 2600 kg/m³ | Assumed lava density, distinct from bulk ash deposit density |
| `lava_max_distance_m` | 20000 m | Cumulative horizontal route cap, not hazard radius; physical travel time uses inclined segment length |
| Raw terrain | 250 m EGM96 grid | Bundled historic terrain; no current crater/runout precision |

A real event configuration additionally needs dated source history, wind by altitude/time, observed column evolution, grain/settling evidence and calibrated lava effusion/rheology/topography with observed paths. These values have not been curated or validated. The current implementation has no inputs/solver for cooling, yield strength, branching, ponding, gases, pyroclastic currents or lahars. See [ERUPTION_RESEARCH.md](ERUPTION_RESEARCH.md) and [ERUPTION_MODEL.md](ERUPTION_MODEL.md) for applicability and equations. The fountain's 6 s flight, 12 m/s horizontal speed and enlarged fragments are display assumptions, not reconstructed Taal 2020 measurements.

## Existing ash values

| Field | Unit and meaning | Teaching value |
| --- | --- | --- |
| `vent_lat`, `vent_lon` | WGS84 latitude/longitude, degrees | Taal 14.0106/120.9975; Mayon 13.257/123.685; Kanlaon 10.4096/123.13 |
| `vent_elevation_m` | Profile elevation in m ASL; model ground datum | 311 / 2462 / 2422 respectively |
| `column_height_m` | m above model ground; subtract ground datum from ASL top | 5000, assumed |
| `mass_rate_kg_s` | Modeled ash mass rate, kg/s | 10000, assumed |
| `duration_s` | Duration of steady source, seconds | 3600, assumed |
| `wind_speed_m_s` | Effective plume-level horizontal speed, m/s | 10, assumed |
| `wind_from_deg` | Meteorological FROM, clockwise from north | 225, assumed |
| `diffusivity_m2_s` | Isotropic horizontal diffusion, m2/s | 500, assumed |
| `initial_spread_m` | Initial horizontal standard deviation, m | 250, assumed |
| `bulk_density_kg_m3` | Deposit bulk density, kg/m3, distinct from particle density | 1000, assumed; no dry/wet measurement |
| `grains[].diameter_um` | Representative class labels, micrometres | 32, 63, 125, 250, 500 |
| `grains[].fraction` | Mass fractions summing to 1 | 0.10, 0.15, 0.25, 0.30, 0.20 |
| `grains[].settling_speed_m_s` | Constant settling speed, m/s | 0.05, 0.20, 0.80, 3, 10, all assumed |

The teaching event has M=QT=36,000,000 kg. If a source supplies mass M instead, enter **Q=M/T**; the rate-only API avoids inconsistent independently editable mass/rate/duration. Volume cannot determine ash mass without reviewed density and consistent material exclusions.

Engineering defaults are a 200 km square, 1 km cells, five grain classes, sixteen midpoint release layers, a 1-degree sweep and a 512 MiB estimated computation budget. Three through five classes are accepted. Bounds protect computation; they do not define scientific applicability.

## Geography and population

Coordinates, elevations and visual form references come from [Smithsonian GVP Taal](https://volcano.si.edu/volcano.cfm?vn=273070), [Mayon](https://volcano.si.edu/volcano.cfm?vn=273030), and [Kanlaon](https://volcano.si.edu/volcano.cfm?vn=272020). These published profile points are not surveyed active-vent positions. The scene uses source-traced geographic elevation; regional overview and other volcanoes retain scale 1:1. Taal close-up uses a labeled sixfold local relief enlargement for visibility. Water and horizontal positions retain their source geometry. A labeled schematic fallback appears if the asset is unavailable or the vent is edited. Particles and wind arrows are enlarged display cues. Terrain does not enter the ash solver; the separate lava teaching model uses the raw Mayon DEM. See [geographic references](GEOGRAPHY_REFERENCES.md) for sampling, historical water levels, shoreline provenance and picture references, and [3D mapping](3D_ILLUSTRATION.md) for the display transform.

`data/catalog.json` includes **318 municipalities/cities and two airports**. Every archived administrative polygon is checked against each fixed 200 × 200 km domain. Taal has 214 intersecting polygons, of which 162 have reviewed code matches and 52 remain unresolved; Mayon has 112, with 37 included and 75 unresolved; Kanlaon has 171, with 109 included and 62 unresolved. These domain counts overlap. Across domains 308 unique included receptors intersect a domain; ten retained legacy receptors lie outside all three domains. The inventory remains incomplete and does not imply complete regional totals. Included, unresolved and retained outside-domain records are published in `data/source/domain-inventory.json`.

Municipality coordinates are equal-area centroids calculated from simplified 2020 geoBoundaries ADM3 polygons in EPSG:6933 and converted back to WGS84. New name-to-code matches require a unique reviewed directory name and a unique boundary name; repeated names remain unresolved. Names are crosswalked to current ten-digit PSGC codes, preserving the official nine-digit correspondence code where available. A current correspondence code does not prove unchanged historical boundaries or a reviewed 2020 code. The Negros Island Region current codes differ from historical codes. General Mariano Alvarez and Basay remain withheld because no unique coordinate match was established.

2024 POPCEN populations are transcribed from official PSA [municipality](https://psa.gov.ph/classification/psgc/municipalities), [city](https://psa.gov.ph/classification/psgc/cities) and provincial directories: [Batangas](https://psa.gov.ph/classification/psgc/citimuni/0401000000), [Cavite](https://psa.gov.ph/classification/psgc/citimuni/0402100000), [Albay](https://psa.gov.ph/classification/psgc/citimuni/0500500000), [Negros Occidental](https://psa.gov.ph/classification/psgc/citimuni/1804500000), [Negros Oriental](https://psa.gov.ph/classification/psgc/citimuni/1804600000). Archived retrieved text extracts preserve source line locators; they are not original HTML pages. **34 Batangas municipalities/cities also have 2020 counts**, manually transcribed from [PSA Batangas QuickSTAT, page 2](https://rsso04a.psa.gov.ph/sites/default/files/infographics/26R0410-QS-005.pdf). The direct PDF/national census downloads returned access challenges; this acquisition limit is explicit in the manifest.

`population_year` selects 2020 or 2024 in the request; the historical route selects 2020. This applies to catalog and custom receptors. An explicit requested-year record (including null) overrides inline metadata; otherwise a count with the same declared year may be used. Missing selected-year values remain null and are counted as unknown, without substituting another census year. Entire municipal populations classified by a centroid are indicative; they are not people counted inside the deposit polygon or complete regional totals.

Source snapshots and SHA-256 hashes are in `data/source/manifest.json` and `data/source/gap-curation-manifest.json`. NOAA and Taal archives have separate manifests. The geoBoundaries metadata specifies boundary year 2020, original NAMRIA/PSA/OCHA sources and CC BY 3.0 IGO. The offline Natural Earth coastline is public domain and presentation only. Source-specific terms and evidence classes are recorded in [PARAMETER_REGISTER.md](PARAMETER_REGISTER.md).

CAAP aerodrome reference points are converted from DMS: [NAIA, section 1.9.1](https://caap.gov.ph/wp-content/uploads/2025/05/Incident-RP-C6198.pdf) and [Bicol, section 1.10.1](https://caap.gov.ph/wp-content/uploads/2024/12/RP-C2080-Accident.pdf). Airport point deposition establishes neither runway-wide conditions nor airborne aviation safety.

## Values still needed for scientific scenarios

- Effective Amihan/Habagat speed and FROM direction, plume altitude, region and averaging period. [PAGASA climate data](https://www.pagasa.dost.gov.ph/climate/climate-data) does not justify numeric plume winds from season alone. Catalog seasonal profiles remain unavailable; manual comparison is possible.
- Source-backed height datum, ash mass/rate, duration, grain fractions/speeds, diffusion, initial spread and dry/wet deposit density for each real scenario.
- Roof load criteria by roof category/conditions; crop thickness criteria by crop and growth stage; facility-specific water/airport surface exposure criteria. No universal damage thresholds are invented. **0.5 mm is a reporting cutoff, not a damage threshold.**
- Sourced water facilities, unresolved municipal matches, and 2020 population records beyond the 34 Batangas records with historical boundary review.
- Raw geolocated Taal thickness observations, original measurement/interpolation uncertainty and independent physical inputs. Two derived footprint traces are available, but their vertices are not independent observations.

`data/source/source-investigations.json` records sources investigated and why values were withheld. USGS building guidance describes condition-dependent vulnerability rather than assessed local roof capacity; its agriculture guidance does not establish a threshold for a specified local crop/growth/rain condition. PAGASA's dam dashboard and Maynilad's facility page identify infrastructure but retrieved text lacks reviewed facility point coordinates. LWUA and a DENR-hosted MWSS monitoring-point candidate returned HTTP 403 for authoritative retrieval. The indexed monitoring-point snippet is retained as a candidate, without renaming it a surveyed treatment-plant location or importing unverified coordinates. Thus the water inventory and roof/crop numerical criteria remain source blocked.

## Taal 2020 reference

The [published study](https://link.springer.com/article/10.1007/s00445-022-01534-y) reports observed plume height 17–21 km **ASL**. Subtracting the 311 m profile ground datum gives 16,689–20,689 m; this is not a surveyed event-vent datum. Its inferred median 17.8 km **above vent** is a different estimate and datum. Deposit volume fits differ by method: 0.042, 0.057 and 0.090 km3. They cannot directly provide modeled ash mass.

The frozen main mapped fallout interval is **13:00 on 12 January to 04:28 on 13 January 2020 local (UTC+8)**, or 55,680 s. This differs from the approximately 17:00–03:00 intense plume interval and the 02:49 transition to fountaining. Endpoint-definition uncertainty and changing winds remain limitations.

NOAA IGRA station RPM00098433 (Tanay, about 75 km from Taal) was investigated as a regional wind proxy. The selected 12 January nominal 00/12 UTC launches occurred at 00:11 and 11:40 UTC. Each supplies nine usable height/wind levels and interpolates only 15/21 positions on the frozen 1–21 km geopotential-ASL grid (71.43%), failing the predeclared 75% coverage requirement. No extrapolation or post-result relaxation is used, so the effective historical wind remains unavailable. Raw ZIP, selected records, processing results and hashes are archived in `data/source/igra/`.

Table 3 gives the 0.05 cm = **0.5 mm** isopach area as 3864.89 km², while narrative/abstract affected-area text gives 8605 km². Both remain distinct unresolved references. The article XML/PDF and actual Figure 4 JPEG are archived from the official [NIH PMC open-data service](https://pmc-oa-opendata.s3.amazonaws.com/README.txt), with archive metadata MD5 verification and local SHA-256 manifests. An earlier rejected HTML download is retained as rejected acquisition evidence.

Two independently frozen manual traces of Figure 4a yield WGS84 geodesic areas **8639.95 and 8656.14 km²**, with vent-centered projected intertrace IoU **0.97918** and boundary Hausdorff distance **1901.34 m**. This quantifies digitization repeatability, not model agreement. The fixed domain clips about **4.98% and 4.88%** of the corresponding projected footprints. Neither trace was adjusted to either published area; original map datum is not stated and WGS84 interpretation is an assumption. Control/pixel bounds do not include original measurement or contour interpolation error. Both traces share one source family and contribute **zero independent point observations**. Historical evaluation remains unavailable because effective wind, active-vent datum, ash inputs and defensible observation uncertainty are incomplete.

## Presentation credential and reproduction

`VITE_MAPTILER_KEY` is an optional browser-visible basemap key; restrict its permitted origins. Rebuild after changing Vite environment values. No key is required for local coastline, contours, tables or computation. Attribution and MapTiler branding remain visible when online tiles are selected.

The source registry records publisher, locator, original units, conversion note, uncertainty, access date and transcription status. Unknown publication dates stay null. `scripts/build_catalog.py` reproduces explicit transcriptions and teaching presets without fetching scientific inputs. `data/examples/*-teaching.json` are accepted simulation requests. Browser scenario exports additionally contain provenance; replay with `{"scenario": exported.scenario}` rather than posting provenance as an input. The strict API rejects unrelated input fields. See `COMPUTATION.md` for the calculations and `VALIDATION.md` for evidence limits.
