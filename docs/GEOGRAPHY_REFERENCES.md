# Geographic display references

These static assets provide geographic orientation for ABO's 3D illustration and impact map. **They do not change the flat-ground ashfall solver.** No terrain, shoreline, weather, or photograph is fetched during a simulation.

The 2026-10-10 optional Mayon lava extension also uses the raw local elevation grid for downhill single-channel routing. This is separate from the ash solver and from display-only Taal enlargement. Its 250 m terrain resolution, historic surface and omitted cooling/branching limit applicability. See [ERUPTION_MODEL.md](ERUPTION_MODEL.md); the reference terrain is not an official lava hazard GIS or current-crater survey.

## Reproduction and provenance

Run the explicit curation command from the repository root:

```powershell
uv run --project backend python scripts/curate_terrain.py
uv run --project backend python scripts/curate_terrain.py --check
```

The first command downloads source snapshots only when absent, then rebuilds display assets. The second validates packaged assets without accessing the network. Raw snapshots and SHA256 provenance are in `data/source/terrain/`; the manifest records source URLs, exact compressed-byte hashes, asset hashes, elevation ranges, and mask counts. Raw HGT cache files are not required to run the application.

## Elevation and surface context

Elevation comes from [Mapzen Skadi's documented HGT tiles](https://raw.githubusercontent.com/tilezen/joerd/master/docs/formats.md), distributed by the [Mapzen Terrain Tiles AWS dataset](https://registry.opendata.aws/terrain-tiles/). For example, Taal uses [N14E120.hgt.gz](https://s3.amazonaws.com/elevation-tiles-prod/skadi/N14/N14E120.hgt.gz), together with adjacent tiles listed in the manifest.

Skadi provides signed big-endian 16-bit heights in gzip-compressed one-degree rasters. Its horizontal coordinates use WGS84 and elevation is referenced to the EGM96 geoid. A value of -32768 is a void; curation fails when a void affects an interpolation sample instead of substituting an invented elevation. Negative seabed elevations remain in the raw display elevation array; sea surfaces are rendered at zero.

Display attribution should identify **Mapzen Terrain Tiles; SRTM/GMTED2010 USGS; ETOPO1 NOAA; Natural Earth public domain; Taal Lake © OpenStreetMap contributors, ODbL 1.0**. Provider-specific terms are documented in [Mapzen's attribution guidance](https://raw.githubusercontent.com/tilezen/joerd/master/docs/attribution.md) and [OpenStreetMap copyright/license information](https://www.openstreetmap.org/copyright). A cached copy of the terrain attribution guidance is included with provenance. The underlying elevation compilation can combine data sources, so it should not be labeled an exclusively SRTM survey.

Each volcano asset uses the catalog's exact latitude and longitude, projected to its local azimuthal-equidistant CRS. Bilinear interpolation produces **401 by 401 samples**, every **250 m**, from -50 km to +50 km on each horizontal axis. Rows increase northward and columns increase eastward. This is the display sampling interval, not a claim of 250 m source survey accuracy or current terrain conditions.

`vent_ground_m` remains the catalog reference elevation: Taal 311 m, Mayon 2462 m, and Kanlaon 2422 m. It is not overwritten with the terrain sample at the catalog coordinate. A coarse DEM, reference summit elevation, crater floor, and nominal vent coordinate need not coincide. In particular, the Taal catalog coordinate lies over historical crater-lake terrain in this DEM.

Land and regional lakes use Natural Earth's public-domain [1:10m physical vectors](https://www.naturalearthdata.com/downloads/10m-physical-vectors/), with snapshots from the project's [land](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson) and [lakes](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson) files. **Taal Lake overrides the generalized Natural Earth polygon with a static OpenStreetMap relation snapshot**, as explained below. The map context is clipped to 116–127° E and 4–22° N. Natural Earth is generalized cartographic data, not a surveyed current coastline or municipal boundary.

The terrain land mask uses 0 for sea, 1 for land, and 2 for lake. Water levels are illustrative surfaces: sea is 0 m; Taal's lake uses a historical 3 m reference explained below. Other lake levels are not hydrologically modeled.

## Taal lake extent and island geometry

Visual QA found a material extent defect in Natural Earth's Lake Taal polygon: its equal-area projected area is **120.046 km²**, with no island hole. That generalized shape is unsuitable for this close regional view.

The application now uses [OpenStreetMap relation 270582](https://www.openstreetmap.org/relation/270582), obtained explicitly from the [standard relation/full endpoint](https://www.openstreetmap.org/api/0.6/relation/270582/full). The cached XML records relation **version 46**, timestamp **2026-08-30T11:43:17Z**, the node/way coordinates, and ODbL attribution. Curation polygonizes 38 outer member ways and 10 inner member ways, then subtracts inner polygons. The resulting valid water polygon has **seven island holes** and an equal-area projected area of **235.972 km²**. This is the area of that particular source geometry, not a claim that it equals the GVP historical lake-area figure.

Both 3D water masks and map water geometry use this same lake polygon, including its native island holes. No DEM threshold removes water or invents island outlines within the OSM polygon. Historical DEM elevations can disagree with newer shoreline mapping; such disagreement is display-source uncertainty, not evidence of modeled terrain or hydrology.

The old DEM >10 m island-preservation heuristic remains only for other generalized regional lakes, or an explicitly recorded Natural Earth fallback if the OSM source cannot be obtained and no cache exists. The main Taal dataset uses the native OSM geometry. Fine crater-lake details inside Volcano Island are not provided by the outer Taal Lake relation and must not be inferred as current water geometry from DEM height alone.

The 3 m Lake Taal surface follows the historical caption for [GVP-01900](https://volcano.si.edu/gallery/ShowImage.cfm?photo=GVP-01900), photographed in 1989. The OSM snapshot contains an `ele=2` tag; this discrepancy is recorded in asset metadata. The display retains the declared historical 3 m level consistently. **Neither reference is treated as a current water-level observation.**

## Volcano appearance references

| Volcano | Verified primary reference | Features guiding the illustration | Rights stated on source page |
|---|---|---|---|
| Taal | [GVP-01888](https://volcano.si.edu/gallery/ShowImage.cfm?photo=GVP-01888), Chris Newhall, 1978, USGS | Low island with overlapping volcanic cones inside the broader lake-filled caldera | Public Domain Work; attribution appreciated |
| Taal detail | [GVP-01900](https://volcano.si.edu/gallery/ShowImage.cfm?photo=GVP-01900), Chris Newhall, 1989, USGS | Main crater lake, surrounding island and distant caldera rim | Public Domain Work; attribution appreciated |
| Mayon | [GVP-01777](https://volcano.si.edu/gallery/ShowImage.cfm?photo=GVP-01777), Kurt Fredrickson, 1968, Smithsonian Institution | Prominent central cone rising above lowlands and the Albay Gulf | CC0; attribution appreciated |
| Kanlaon | [GVP-11191](https://volcano.si.edu/gallery/ShowImage.cfm?photo=GVP-11191), NASA Landsat, 2003, courtesy Hawaii Synergy Project | Broad massif, elongated summit ridge and multiple summit features | Public Domain Work; attribution appreciated |

Photo pages and captions were checked during curation. Images are linked as shape references; no remote photograph was downloaded or embedded in the app. Historical imagery is not evidence of the current crater geometry or activity.

## Scientific boundary

Elevation may position and shade land in the illustration, while ash paths retain the backend's flat-ground release and settling interpretation. ABO does not compute terrain interception, orographic winds, wet deposition, lake chemistry, runoff, or ash-flow interactions. Final map thickness remains the computed grid average; municipality load remains a centroid point sample. A more recognizable volcano or shoreline does not establish historical forecast accuracy.
