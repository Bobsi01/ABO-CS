# Eruption research registry

Manually reviewed 2026-10-10. These references support qualitative mechanisms, mathematical assumptions and dated context; they do not provide a calibrated eruption forecast. The UI's local `eruptionResearch.ts` records titles, publishers, dates, URLs and interpretation limits. No runtime scientific-data collection is used.

| Source / date | Reference | Supported use | Evidence limits |
| --- | --- | --- | --- |
| USGS / 1996 | [Pinatubo: Koyaguchi chapter](https://pubs.usgs.gov/pinatubo/koya/) | Buoyant rise, neutral-buoyancy spreading, wind and grain effects | Pinatubo explanation guides form; ABO does not implement its plume dynamics |
| USGS / undated | [Lava flow controls and effects](https://www.usgs.gov/programs/VHP/lava-flows-destroy-everything-their-path) | Viscosity, slope, confinement, effusion; direct burial/ignition | General mechanism, not Mayon rheology or runout. Full text available in search cache; direct retrieval intermittently returned 405 |
| Communications Earth & Environment / 2025, 6:1039 | [Lava effusion in mountainous terrain generates flow backup and excess inundation](https://www.nature.com/articles/s43247-025-02991-x.pdf), Borch, Jones and Russell | Jeffreys Newtonian **mean** velocity, Eq. 3, p. 3; notation table p. 2 | Publisher PDF text retrieved in full after HTML failed. Eq. 3 uses inclined-channel depth/velocity; screenshot retrieval failed. Primary analog experiments support the assumptions, not Mayon parameters or ABO runout. Backup and constrictions in the paper are omitted by ABO |
| Smithsonian GVP / January 2020 reports | [Taal profile and archived activity](https://volcano.si.edu/volcano.cfm?vn=273070) | Historical lava fountaining, steam/ash plume activity | GVP reports PHIVOLCS observations; direct archived PHIVOLCS Jan 13 bulletin failed in QA. No effusion/viscosity preset inferred |
| PHIVOLCS / 2021-02-15 | [Taal advisory](https://www.phivolcs.dost.gov.ph/taal-volcano-advisory-15-february-2021-03-30-p-m/) | Volcano Island identified as permanent danger zone | Dated reference, not a current alert. Displayed island outline is cached OSM shoreline context, not official hazard GIS |
| PHIVOLCS / 2023-11-24 | [Mayon bulletin](https://www.phivolcs.dost.gov.ph/mayon-volcano-bulletin-24-november-2023-8-00-am/) | Channelized lava and 6 km PDZ | Search cache verified flows along named gullies and PDZ. Circle is dated multiple-hazard context; default route is not those observed gullies |
| PHIVOLCS / 2024-06-04 | [Kanlaon activity report](https://www.phivolcs.dost.gov.ph/volcanic-activity-report-kanlaon-volcano-negros-island-04-june-2024/) | 4 km PDZ; explosive ash, PDC and ballistic distinction | Primary page read. The report distinguishes historical lava flows from this explosive event; no default lava flow inferred |
| USGS / 2015-12-17 | [Buildings](https://volcanoes.usgs.gov/volcanic_ash/buildings.html) | Deposit loading and building/system vulnerability | No universal roof-collapse threshold applied; building condition, wetness and design matter |
| USGS / 2015-12-15 | [Agriculture](https://volcanoes.usgs.gov/volcanic_ash/agriculture.html) | Crop/growth conditions, ash thickness, chemistry and rainfall | No universal crop-loss percentage inferred |
| USGS / 2015-12-15 | [Water and wastewater](https://volcanoes.usgs.gov/volcanic_ash/water_wastewater.html) | Collection/treatment system obstruction and overload | Ground thickness does not determine potability |
| Lagmay et al. / 2021-08-03 | [Hazardous base surges of Taal's 2020 eruption](https://www.nature.com/articles/s41598-021-94866-2) | Distinction between ash plume, hot wet PDC and lava | Independently reviewed by QA. Those PDCs are not represented by ABO lava ribbons or fallout contours |
| USGS HVO / 2019-02-28 | [How lava flows cool](https://www.usgs.gov/observatories/hvo/news/volcano-watch-how-do-lava-flows-cool-and-how-long-does-it-take) | Thermal/insulation/thickness influences | Independently reviewed by QA. Hot/cool scene colors cannot claim physical cooling time |

## Map interpretation

The accumulated-ash contour levels (0.5, 1, 5, 10, 50, 100 mm) come from Python. They are wind-dependent reporting footprints, not universal circular hazard radii. Each point is a local municipal centroid or facility sample, with unknown status outside the domain. No municipal polygon inundation or building damage inventory has been curated.

Optional dashed outlines are **dated PDZ references**. Mayon and Kanlaon use the documented radius about the catalog source coordinate, which can differ from a surveyed active-vent coordinate. Taal uses its island shoreline; a circle would misstate that record. These reference zones cover hazards omitted from the simulator and remain context regardless of the timeline. They are not current evacuation advice or outputs of this simulation.

Lava's orange polygon is the prescribed-width channel reached at the selected model clock, calculated from raw DEM routing and assumed fluid parameters. It does not model actual field inundation. The enlarged line/ribbon is illustrative. A point outside a channel or below the ash reporting threshold is not a safety determination.

## Missing research values

Measured ash rate, release-height profile, effective altitude-dependent wind, settling/aggregation, diffusivity and deposit density remain needed for event-specific ash evaluation. Calibrated lava needs vent location, time-varying effusion, rheology/temperature, cooling/yield strength and suitable terrain/channel observations. Held-out deposit/runout observations are required for validation. All teaching physical values remain visibly assumed; sourced positions/populations do not certify those physics.
