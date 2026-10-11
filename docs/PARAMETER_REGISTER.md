# Parameter evidence register

Revision: `2026-10-11-gap-evidence-v1`. Reproduce with `uv run python ../scripts/build_parameter_register.py` from `backend/` after the catalog build.

The authoritative records are `data/source/gap-evidence-register.json`, exposed through `GET /api/catalog`. **Usable** means usable for the explicitly stated purpose, not empirical validation. A missing measured value is a required measurement category with no accepted value. **Illustrative** values are assumptions or engineering choices. No parameter is currently calibrated.

Frozen retrospective case: 12 January 2020 13:00 to 13 January 04:28 local (UTC+8), 55,680 s. The numerical solver is available; historical agreement is not established. Methodological approval of `taal-main-plume-2020-v1` does not approve missing physical inputs.

| Parameter | Class | Value | Units | Readiness |
| --- | --- | --- | --- | --- |
| Taal main mapped event duration | derived | 55680 | s | usable |
| Satellite-reported plume altitude | measured | 17000, 21000 | m ASL | source_blocked |
| Taal active 2020 vent elevation | measured | Unavailable | m ASL | source_blocked |
| Effective Taal event wind | derived | Unavailable | m/s and degrees FROM | source_blocked |
| Modeled airborne ash mass | measured | Unavailable | kg | source_blocked |
| Bulk dry deposit density | measured | Unavailable | kg/m3 | source_blocked |
| Whole-event emitted grain fractions | measured | Unavailable | fraction | source_blocked |
| Class settling speeds | derived | Unavailable | m/s | source_blocked |
| Horizontal diffusivityK | assumed | 500 | m2/s | illustrative |
| Initial standard deviation sigma0 | assumed | 250 | m | illustrative |
| Teaching bulk density | assumed | 1000 | kg/m3 | illustrative |
| Teaching grain fractions | assumed | 0.1, 0.15, 0.25, 0.3, 0.2 | fraction | illustrative |
| Teaching settling speeds | assumed | 0.05, 0.2, 0.8, 3, 10 | m/s | illustrative |
| Published 0.5 mm reference footprint | derived | Two independently digitized Figure 4a outer contours | longitude/latitude degrees; threshold 0.5 mm | usable |
| Condition-specific roof load criterion | derived | Unavailable | kg/m2 | source_blocked |
| Condition-specific crop thickness criterion | derived | Unavailable | mm | source_blocked |
| Teaching column height | assumed | 5000 | m above model ground | illustrative |
| Teaching ash mass rate | assumed | 10000 | kg/s | illustrative |
| Teaching steady-source duration | assumed | 3600 | s | illustrative |
| Teaching effective wind speed | assumed | 10 | m/s | illustrative |
| Teaching wind-from bearing | assumed | 225 | degrees clockwise from north | illustrative |
| Teaching class diameters | assumed | 32, 63, 125, 250, 500 | micrometres | illustrative |
| Computational domain width | assumed | 200 | km | illustrative |
| Computational cell width | assumed | 1 | km | illustrative |
| Midpoint release layers | assumed | 16 | count | illustrative |
| Wind sweep increment | assumed | 1 | degrees | illustrative |
| Estimated computation memory limit | assumed | 536870912 | bytes | illustrative |
| Taal volcano profile location and elevation | derived | 14.0106, 120.9975, 311 | latitude degrees, longitude degrees, m ASL | usable |
| Mayon volcano profile location and elevation | derived | 13.257, 123.685, 2462 | latitude degrees, longitude degrees, m ASL | usable |
| Kanlaon volcano profile location and elevation | derived | 10.4096, 123.13, 2422 | latitude degrees, longitude degrees, m ASL | usable |
| Reviewed water-facility coordinates | derived | Unavailable | latitude/longitude degrees | source_blocked |

## Datum, uncertainty, provenance and dependencies

### Taal main mapped event duration

`event-duration` — derived; usable. Value: 55680 s.

Datum: 13:00 on 12 Januaryâ€“04:28 on 13 January local UTC+8. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [taal-study](https://link.springer.com/article/10.1007/s00445-022-01534-y). Locator: Deposit volume calculation main-part interval; Figure 4 rounds the end to about 04:00. License: Taal article CC BY 4.0; third-party material may have separate terms.

Conversions: Convert local UTC+8 endpoints to UTC; elapsed interval = 55,680 s. Dependencies: taal-deposit-study.

Main event is separate from peak seismic interval 17:00â€“03:00, not full eruption. End-definition uncertainty retained.

### Satellite-reported plume altitude

`plume-observed` — measured; source_blocked. Value: 17000, 21000 m ASL.

Datum: Above sea level. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [taal-study](https://link.springer.com/article/10.1007/s00445-022-01534-y). Locator: Field observations; cited Bachmeier/Perttu. License: Taal article CC BY 4.0; third-party material may have separate terms.

Conversions: Satellite altitude km ASL multiplied by 1000; model height cannot be derived without an active-vent datum. Dependencies: none recorded.

Range known; active vent datum not surveyed/reviewed so conversion to model H unavailable.

### Taal active 2020 vent elevation

`vent-active-datum` — measured; source_blocked. Value: Unavailable m ASL.

Datum: Active vent, not highest volcano-profile point. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [gvp-taal](https://volcano.si.edu/volcano.cfm?vn=273070). Locator: GVP profile 311 m is regional volcano elevation. License: Smithsonian GVP profile terms not independently verified; attribution retained.

Conversions: None unless stated in notes. Dependencies: none recorded.

No surveyed active-vent datum is curated; 311 m is the illustrative volcano-profile ground only.

### Effective Taal event wind

`wind-effective` — derived; source_blocked. Value: Unavailable m/s and degrees FROM.

Datum: 1â€“21 km geopotential ASL; height grid 1 km. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [noaa-igra](https://www.ncei.noaa.gov/products/weather-balloon/integrated-global-radiosonde-archive). Locator: Selected 12 January nominal 00/12 launches, actual 00:11/11:40 UTC. License: NOAA public US-government archive; upstream Philippines station-provider terms not independently verified.

Conversions: Wind speed tenths m/s divided by 10; wind-from bearings converted to E/N vectors before averaging. Dependencies: none recorded.

Both launches have 9 accepted levels; grid coverage 15/21 = 71.43% fails the predeclared 75% gate. The station is about 75 km from Taal; changing winds are not represented.

### Modeled airborne ash mass

`ash-mass` — measured; source_blocked. Value: Unavailable kg.

Datum: Main-plume ash excluding other deposits. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [taal-study](https://link.springer.com/article/10.1007/s00445-022-01534-y). Locator: Tephra volume fits 0.042/0.057/0.090 kmÂ³. License: Taal article CC BY 4.0; third-party material may have separate terms.

Conversions: None unless stated in notes. Dependencies: taal-deposit-study.

Deposit volume does not give independent ash mass; conversion depends density/exclusions.

### Bulk dry deposit density

`bulk-density` — measured; source_blocked. Value: Unavailable kg/m3.

Datum: Dry bulk deposit; not particle density. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [taal-study](https://link.springer.com/article/10.1007/s00445-022-01534-y). Locator: No accepted independent event bulk-density dataset. License: Taal article CC BY 4.0; third-party material may have separate terms.

Conversions: None unless stated in notes. Dependencies: taal-deposit-study.

Thickness identifies M/rho; mass and density cannot both be inferred from thickness.

### Whole-event emitted grain fractions

`grain-spectrum` — measured; source_blocked. Value: Unavailable fraction.

Datum: Mass spectrum at source. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [taal-study](https://link.springer.com/article/10.1007/s00445-022-01534-y). Locator: Samples 1â€“4 deposit PSD different locations/time. License: Taal article CC BY 4.0; third-party material may have separate terms.

Conversions: None unless stated in notes. Dependencies: taal-deposit-study.

Local deposited sample distributions are not whole erupted grain spectrum.

### Class settling speeds

`settling-speeds` — derived; source_blocked. Value: Unavailable m/s.

Datum: Fixed class falling speeds. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [taal-study](https://link.springer.com/article/10.1007/s00445-022-01534-y). Locator: No accepted terminal-speed evidence tied to emitted classes. License: Taal article CC BY 4.0; third-party material may have separate terms.

Conversions: None unless stated in notes. Dependencies: none recorded.

Shape/aggregation influence speeds; observed deposit grains do not supply measured terminal velocities.

### Horizontal diffusivityK

`diffusivity` — assumed; illustrative. Value: 500 m2/s.

Datum: Flat uniform-wind reduced model. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: Teaching presets. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None unless stated in notes. Dependencies: none recorded.

Not historically calibrated. Only K/sigma may fit if approved independent-group protocol becomes usable.

### Initial standard deviation sigma0

`initial-spread` — assumed; illustrative. Value: 250 m.

Datum: Vent-centered horizontal. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: Teaching presets. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None unless stated in notes. Dependencies: none recorded.

Not a source-reviewed historical estimate.

### Teaching bulk density

`teaching-density` — assumed; illustrative. Value: 1000 kg/m3.

Datum: Dry deposit convention. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: Teaching presets. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None unless stated in notes. Dependencies: none recorded.

Illustrative load-to-thickness input; no Taal event inference.

### Teaching grain fractions

`teaching-grains` — assumed; illustrative. Value: 0.1, 0.15, 0.25, 0.3, 0.2 fraction.

Datum: Five illustrative classes. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: Teaching presets. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None unless stated in notes. Dependencies: none recorded.

Fractions sum to 1; no event calibration.

### Teaching settling speeds

`teaching-settling` — assumed; illustrative. Value: 0.05, 0.2, 0.8, 3, 10 m/s.

Datum: Fixed classes. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: Teaching presets. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None unless stated in notes. Dependencies: none recorded.

No measured 2020 event basis.

### Published 0.5 mm reference footprint

`observation-geometry` — derived; usable. Value: Two independently digitized Figure 4a outer contours longitude/latitude degrees; threshold 0.5 mm.

Datum: Printed graticule interpreted as WGS84; original map datum not stated. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [taal-study](https://link.springer.com/article/10.1007/s00445-022-01534-y). Locator: Figure 4 isopach, raw CSV not exposed. License: Taal article CC BY 4.0; third-party material may have separate terms.

Conversions: 0.05 cm multiplied by 10 = 0.5 mm; separate affine pixel-to-graticule fits. Dependencies: taal-deposit-study.

Usable only as a derived reference footprint. Figure 4 JPEG, article XML and PDF are archived from the official NIH PMC open-data service. Two frozen manual traces were independently georeferenced and compared. Source geometry remains dependent on the deposit study; vertices are not independent thickness observations. Original observation/interpolation uncertainty is not quantified.

### Condition-specific roof load criterion

`roof-criterion` — derived; source_blocked. Value: Unavailable kg/m2.

Datum: Roof condition/type required. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [usgs-building-conditions](https://volcanoes.usgs.gov/volcanic_ash/buildings.html). Locator: Structural impacts section. License: USGS public government text; third-party items may have different terms.

Conversions: None unless stated in notes. Dependencies: none recorded.

General vulnerability information is insufficient to define a load threshold. Assessment remains unknown.

### Condition-specific crop thickness criterion

`crop-criterion` — derived; source_blocked. Value: Unavailable mm.

Datum: Crop/growth/ash/rain conditions required. Uncertainty: Not a complete predictive uncertainty bound; see notes.

Source: [usgs-crop-conditions](https://volcanoes.usgs.gov/volcanic_ash/agriculture.html). Locator: Agriculture summary. License: USGS public government text; third-party items may have different terms.

Conversions: None unless stated in notes. Dependencies: none recorded.

The general 100â€“150 mm range does not define a threshold for a specified local crop condition. Assessment remains unknown.

### Teaching column height

`teaching-height` — assumed; illustrative. Value: 5000 m above model ground.

Datum: Profile elevation used as teaching model ground. Uncertainty: No measured event uncertainty assigned; engineering or teaching choice.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: scripts/build_catalog.py teaching presets; backend contracts/kernel. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None. Dependencies: none recorded.

Not a reviewed Taal, Mayon or Kanlaon event input.

### Teaching ash mass rate

`teaching-rate` — assumed; illustrative. Value: 10000 kg/s.

Datum: Modeled ash only. Uncertainty: No measured event uncertainty assigned; engineering or teaching choice.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: scripts/build_catalog.py teaching presets; backend contracts/kernel. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None. Dependencies: none recorded.

Not a reviewed Taal, Mayon or Kanlaon event input.

### Teaching steady-source duration

`teaching-duration` — assumed; illustrative. Value: 3600 s.

Datum: Teaching event, separate from historical interval. Uncertainty: No measured event uncertainty assigned; engineering or teaching choice.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: scripts/build_catalog.py teaching presets; backend contracts/kernel. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None. Dependencies: none recorded.

Not a reviewed Taal, Mayon or Kanlaon event input.

### Teaching effective wind speed

`teaching-wind-speed` — assumed; illustrative. Value: 10 m/s.

Datum: Uniform horizontal wind; no measured altitude/time context. Uncertainty: No measured event uncertainty assigned; engineering or teaching choice.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: scripts/build_catalog.py teaching presets; backend contracts/kernel. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None. Dependencies: none recorded.

Not a reviewed Taal, Mayon or Kanlaon event input.

### Teaching wind-from bearing

`teaching-wind-from` — assumed; illustrative. Value: 225 degrees clockwise from north.

Datum: Meteorological FROM bearing. Uncertainty: No measured event uncertainty assigned; engineering or teaching choice.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: scripts/build_catalog.py teaching presets; backend contracts/kernel. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None. Dependencies: none recorded.

Not a reviewed Taal, Mayon or Kanlaon event input.

### Teaching class diameters

`teaching-diameters` — assumed; illustrative. Value: 32, 63, 125, 250, 500 micrometres.

Datum: Class labels; do not derive settling speeds from these labels. Uncertainty: No measured event uncertainty assigned; engineering or teaching choice.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: scripts/build_catalog.py teaching presets; backend contracts/kernel. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None. Dependencies: none recorded.

Not a reviewed Taal, Mayon or Kanlaon event input.

### Computational domain width

`domain-width` — assumed; illustrative. Value: 200 km.

Datum: Vent-centered metric square. Uncertainty: No measured event uncertainty assigned; engineering or teaching choice.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: scripts/build_catalog.py teaching presets; backend contracts/kernel. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None. Dependencies: none recorded.

Not a reviewed Taal, Mayon or Kanlaon event input.

### Computational cell width

`cell-width` — assumed; illustrative. Value: 1 km.

Datum: Exact integrated cell averages. Uncertainty: No measured event uncertainty assigned; engineering or teaching choice.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: scripts/build_catalog.py teaching presets; backend contracts/kernel. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None. Dependencies: none recorded.

Not a reviewed Taal, Mayon or Kanlaon event input.

### Midpoint release layers

`release-layers` — assumed; illustrative. Value: 16 count.

Datum: Uniform mass release-height approximation. Uncertainty: No measured event uncertainty assigned; engineering or teaching choice.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: scripts/build_catalog.py teaching presets; backend contracts/kernel. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None. Dependencies: none recorded.

Not a reviewed Taal, Mayon or Kanlaon event input.

### Wind sweep increment

`sweep-step` — assumed; illustrative. Value: 1 degrees.

Datum: 0 through 359 degrees FROM. Uncertainty: No measured event uncertainty assigned; engineering or teaching choice.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: scripts/build_catalog.py teaching presets; backend contracts/kernel. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None. Dependencies: none recorded.

Not a reviewed Taal, Mayon or Kanlaon event input.

### Estimated computation memory limit

`memory-budget` — assumed; illustrative. Value: 536870912 bytes.

Datum: Pre-allocation estimated kernel working budget. Uncertainty: No measured event uncertainty assigned; engineering or teaching choice.

Source: [assumptions](/documentation/INPUT_VALUES.md). Locator: scripts/build_catalog.py teaching presets; backend contracts/kernel. License: Locally authored ABO teaching assumptions; no measured-data license inferred.

Conversions: None. Dependencies: none recorded.

Not a reviewed Taal, Mayon or Kanlaon event input.

### Taal volcano profile location and elevation

`profile-geography-taal` — derived; usable. Value: 14.0106, 120.9975, 311 latitude degrees, longitude degrees, m ASL.

Datum: Published profile; WGS84 interpretation used by application. Uncertainty: Not a surveyed event active-vent position or vertical datum.

Source: [gvp-taal](https://volcano.si.edu/volcano.cfm?vn=273070). Locator: Smithsonian Global Volcanism Program volcano profile. License: Smithsonian GVP profile terms not independently verified; attribution retained.

Conversions: None; do not subtract profile elevation as a reviewed active-vent datum. Dependencies: none recorded.

Usable for approximate geography and teaching model ground only. Historical active-vent conversion remains blocked.

### Mayon volcano profile location and elevation

`profile-geography-mayon` — derived; usable. Value: 13.257, 123.685, 2462 latitude degrees, longitude degrees, m ASL.

Datum: Published profile; WGS84 interpretation used by application. Uncertainty: Not a surveyed event active-vent position or vertical datum.

Source: [gvp-mayon](https://volcano.si.edu/volcano.cfm?vn=273030). Locator: Smithsonian Global Volcanism Program volcano profile. License: Smithsonian GVP profile terms not independently verified; attribution retained.

Conversions: None; do not subtract profile elevation as a reviewed active-vent datum. Dependencies: none recorded.

Usable for approximate geography and teaching model ground only. Historical active-vent conversion remains blocked.

### Kanlaon volcano profile location and elevation

`profile-geography-kanlaon` — derived; usable. Value: 10.4096, 123.13, 2422 latitude degrees, longitude degrees, m ASL.

Datum: Published profile; WGS84 interpretation used by application. Uncertainty: Not a surveyed event active-vent position or vertical datum.

Source: [gvp-kanlaon](https://volcano.si.edu/volcano.cfm?vn=272020). Locator: Smithsonian Global Volcanism Program volcano profile. License: Smithsonian GVP profile terms not independently verified; attribution retained.

Conversions: None; do not subtract profile elevation as a reviewed active-vent datum. Dependencies: none recorded.

Usable for approximate geography and teaching model ground only. Historical active-vent conversion remains blocked.

### Reviewed water-facility coordinates

`water-facility-coordinates` — derived; source_blocked. Value: Unavailable latitude/longitude degrees.

Datum: Facility role and geographic datum must be reviewed. Uncertainty: No accepted coordinate or inventory coverage.

Source: [water-inventory-candidates](https://eia.emb.gov.ph/wp-content/uploads/2022/09/AWTIP-T5-EPRMP.pdf). Locator: data/source/source-investigations.json. License: Source-specific terms not independently verified; attribution retained.

Conversions: No candidate coordinates converted or imported. Dependencies: none recorded.

PAGASA and operator descriptions lack explicit reviewed facility coordinates in retrieved text. LWUA and DENR candidate original access returned 403. Monitoring-site roles cannot be relabeled as surveyed treatment plants. Surface screening would not establish water potability.

## Frozen source-gate findings

Both selected Tanay launches provide 15/21 interpolable height-grid positions (71.43%), below the frozen 75% requirement. No effective historical wind is accepted. Raw records, processing flags, vectors and hashes are retained in `data/source/igra/`.

Two independent manual traces of the published 0.5 mm contour are accepted as derived reference geometry. They share one observation family and contribute zero independent thickness observations. Their intertrace IoU is a digitization repeatability measure, not model agreement. Both complete and clipped areas are retained, along with the unresolved 8,605 versus 3,864.89 km² published area statements.

318 municipality/city receptors and two airports are available. 34 Batangas receptors have 2020 counts; others have explicit missing historical counts. Inventory inclusion, unresolved polygons and current/correspondence codes are recorded separately from centroid exposure. Current correspondence codes do not establish historical boundary stability.

Source terms are recorded per publisher. PSA original national downloads and the Batangas PDF direct download were unavailable; archived source-line extracts and manual transcriptions are disclosed rather than represented as original files.

See [EVALUATION_PROTOCOL.md](EVALUATION_PROTOCOL.md), [INPUT_VALUES.md](INPUT_VALUES.md), [COMPUTATION.md](COMPUTATION.md), `data/source/gap-curation-manifest.json`, `data/source/taal-study/manifest.json` and `data/source/domain-inventory.json`.
