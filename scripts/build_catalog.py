"""Build local records from explicitly transcribed references; no runtime fetching."""

# ruff: noqa: E501 -- preserve direct reference URLs and explicit data records

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATE = "2026-10-09"


def source(
    identifier, title, url, publisher, locator, units="not applicable", notes="", published_at=None
):
    return dict(
        id=identifier,
        title=title,
        url=url,
        publisher=publisher,
        published_at=published_at,
        accessed_at=DATE,
        locator=locator,
        original_units=units,
        conversions="See INPUT_VALUES.md",
        uncertainty="Not quantified by this reference",
        review_status="transcribed",
        notes=notes,
    )


sources = [
    source(
        "gvp-taal",
        "Taal volcano profile",
        "https://volcano.si.edu/volcano.cfm?vn=273070",
        "Smithsonian GVP",
        "Coordinates, elevation, geological summary",
        "degrees; metres ASL",
    ),
    source(
        "gvp-mayon",
        "Mayon volcano profile",
        "https://volcano.si.edu/volcano.cfm?vn=273030",
        "Smithsonian GVP",
        "Coordinates, elevation, geological summary",
        "degrees; metres ASL",
    ),
    source(
        "gvp-kanlaon",
        "Kanlaon volcano profile",
        "https://volcano.si.edu/volcano.cfm?vn=272020",
        "Smithsonian GVP",
        "Coordinates, elevation, geological summary",
        "degrees; metres ASL",
    ),
    source(
        "boundaries",
        "Philippines municipal boundaries, gbOpen ADM3",
        "https://www.geoboundaries.org/",
        "geoBoundaries; original NAMRIA/PSA/OCHA",
        "PHL-ADM3-30758251; boundary year 2020; simplified geometry",
        "WGS84 degrees",
        "CC BY 3.0 IGO. Centroids calculated in EPSG:6933, returned in WGS84. These are polygon centroids, not municipal halls. Snapshot hashes in data/source/manifest.json.",
    ),
    source(
        "assumptions",
        "Illustrative teaching assumptions",
        "/documentation/INPUT_VALUES.md",
        "ABO project",
        "Illustrative defaults table",
        "SI",
        "Assumed teaching values, not measured eruption or weather data; unreviewed physics.",
    ),
    source(
        "taal-study",
        "Analysis of the 2020 Taal Volcano tephra fall deposits from crowdsourced information and field data",
        "https://link.springer.com/article/10.1007/s00445-022-01534-y",
        "Balangue-Tarriela et al., Springer Bulletin of Volcanology",
        "Abstract, Table 3, Tephra volume estimates, Discussion",
        "cm; km2; km3; km ASL/above vent",
        "Published 2022; CC BY 4.0. Table 3 and narrative footprint areas disagree; do not treat area values as spatial polygons.",
        published_at="2022-03-02",
    ),
    source(
        "pagasa",
        "Climate data",
        "https://www.pagasa.dost.gov.ph/climate/climate-data",
        "DOST-PAGASA",
        "Climate information portal",
        "No numeric plume-level winds curated",
        "Season alone does not specify effective plume wind speed, direction, altitude or averaging period.",
    ),
    source(
        "tephra2",
        "Official Tephra2 implementation",
        "https://github.com/geoscience-community-codes/tephra2",
        "geoscience-community-codes",
        "Analytical model reference",
        notes="ABO is a simplified independent model, not equivalent to full Tephra2.",
    ),
    source(
        "natural-earth",
        "Natural Earth 1:50m coastline",
        "https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-coastline/",
        "Natural Earth",
        "ne_50m_coastline",
        "degrees",
        "Public domain, clipped for offline presentation only; not numerical terrain.",
    ),
    source(
        "caap-naia",
        "Incident RP-C6198 final report",
        "https://caap.gov.ph/wp-content/uploads/2025/05/Incident-RP-C6198.pdf",
        "Civil Aviation Authority of the Philippines",
        "Section 1.9.1 aerodrome reference point",
        "DMS",
        "ARP 14 deg 30 min 35.78 sec N, 121 deg 00 min 49.892 sec E; surface exposure only.",
    ),
    source(
        "caap-bicol",
        "Accident RP-C2080 final report",
        "https://caap.gov.ph/wp-content/uploads/2024/12/RP-C2080-Accident.pdf",
        "Civil Aviation Authority of the Philippines",
        "Section 1.10.1 aerodrome reference point",
        "DMS",
        "ARP 13 deg 06 min 46 sec N, 123 deg 40 min 40 sec E; surface exposure only.",
    ),
]

# name | ten-digit current PSGC | 2024 POPCEN population. Deliberate subset.
groups = [
    (
        "Batangas",
        "0401000000",
        (13.5, 14.25, 120.4, 121.6),
        """
Agoncillo|0401001000|40662
Alitagtag|0401002000|28033
Balayan|0401003000|96939
Balete|0401004000|24202
Batangas|0401005000|358267
Bauan|0401006000|94016
Calaca|0401007000|92281
Calatagan|0401008000|60420
Cuenca|0401009000|36453
Ibaan|0401010000|58673
Laurel|0401011000|44791
Lemery|0401012000|94736
Lian|0401013000|56788
Lipa|0401014000|387392
Lobo|0401015000|41251
Mabini|0401016000|49876
Malvar|0401017000|74565
Mataasnakahoy|0401018000|31912
Nasugbu|0401019000|141063
Padre Garcia|0401020000|53526
Rosario|0401021000|131365
San Jose|0401022000|81170
San Juan|0401023000|115118
San Luis|0401024000|36841
San Nicolas|0401025000|24392
San Pascual|0401026000|69419
Santa Teresita|0401027000|21742
Santo Tomas|0401028000|226772
Taal|0401029000|61559
Talisay|0401030000|46477
Tanauan|0401031000|209697
Taysan|0401032000|41332
Tingloy|0401033000|15866
Tuy|0401034000|47199
""",
    ),
    (
        "Cavite",
        "0402100000",
        (14.0, 14.65, 120.5, 121.15),
        """
Alfonso|0402101000|60583
Amadeo|0402102000|44190
General Emilio Aguinaldo|0402107000|24264
Indang|0402110000|70092
Kawit|0402111000|123631
Magallanes|0402112000|25826
Maragondon|0402113000|41977
Mendez|0402114000|36518
Naic|0402115000|236978
Noveleta|0402116000|46172
Rosario|0402117000|112572
Silang|0402118000|313145
Tagaytay|0402119000|87811
Tanza|0402120000|339308
Ternate|0402121000|24891
Trece Martires|0402122000|227892
General Mariano Alvarez|0402123000|176927
""",
    ),
    (
        "Albay",
        "0500500000",
        (12.8, 13.65, 123.2, 124.3),
        """
Bacacay|0500501000|72298
Camalig|0500502000|73087
Daraga|0500503000|138000
Guinobatan|0500504000|84420
Jovellar|0500505000|17538
Legazpi|0500506000|210616
Libon|0500507000|72135
Ligao|0500508000|119779
Malilipot|0500509000|41066
Malinao|0500510000|49570
Manito|0500511000|26425
Oas|0500512000|64890
Pio Duran|0500513000|48713
Polangui|0500514000|89344
Rapu-Rapu|0500515000|36281
Santo Domingo|0500516000|37586
Tabaco|0500517000|140779
Tiwi|0500518000|56871
""",
    ),
    (
        "Negros Occidental",
        "1804500000",
        (9.3, 11.1, 122.2, 123.65),
        """
Bago|1804502000|192993
Binalbagan|1804503000|72594
Cadiz|1804504000|161558
Calatrava|1804505000|83813
Candoni|1804506000|22083
Cauayan|1804507000|110899
Enrique B. Magalona|1804508000|65730
Escalante|1804509000|97050
Himamaylan|1804510000|117286
Hinigaran|1804511000|90403
Hinoba-an|1804512000|64364
Ilog|1804513000|63444
Isabela|1804514000|65399
Kabankalan|1804515000|210893
La Carlota|1804516000|67740
La Castellana|1804517000|82500
Manapla|1804518000|55882
Moises Padilla|1804519000|44864
Murcia|1804520000|90123
Pontevedra|1804521000|54941
Pulupandan|1804522000|31942
Sagay|1804523000|152543
San Carlos|1804524000|133175
San Enrique|1804525000|24424
Silay|1804526000|136802
Sipalay|1804527000|73847
Toboso|1804529000|44973
Valladolid|1804530000|40487
Salvador Benedicto|1804532000|28231
""",
    ),
    (
        "Negros Oriental",
        "1804600000",
        (9.0, 10.65, 122.7, 123.65),
        """
Amlan|1804601000|26566
Ayungon|1804602000|50688
Bacong|1804603000|43889
Bais|1804604000|88050
Basay|1804605000|30018
Bayawan|1804606000|126744
Bindoy|1804607000|41543
Canlaon|1804608000|62785
Dauin|1804609000|30921
Dumaguete|1804610000|142171
Guihulngan|1804611000|106576
Jimalalud|1804612000|32996
La Libertad|1804613000|42721
Mabinay|1804614000|85770
Manjuyod|1804615000|46461
Pamplona|1804616000|41209
San Jose|1804617000|22870
Santa Catalina|1804618000|80382
Siaton|1804619000|84169
Sibulan|1804620000|69092
Tanjay|1804621000|84593
Tayasan|1804622000|39005
Valencia|1804623000|39986
Vallehermoso|1804624000|42421
Zamboanguita|1804625000|30412
""",
    ),
]


def normalized(name):
    name = name.casefold().replace("city of", "").replace("city", "")
    return re.sub(r"[^a-z]", "", name)


centroids = json.loads(
    (ROOT / "data/source/derived-municipal-centroids.json").read_text(encoding="utf-8")
)
aliases = {
    "Mendez": "Mendez (Mendez-Nunez)",
    "Canlaon": "Canlaon",
    "Enrique B. Magalona": "Enrique B. Magalona (Saravia)",
}
receptors = []
unmatched = []
for province, province_code, bounds, rows in groups:
    sid = "psa-" + province_code
    sources.append(
        source(
            sid,
            f"PSGC {province}: cities and municipalities",
            f"https://psa.gov.ph/classification/psgc/citimuni/{province_code}",
            "Philippine Statistics Authority",
            "2024 POPCEN population column, current ten-digit PSGC",
            "persons; PSGC",
            "Manual transcription. Current administrative codes can differ from 2020 codes, especially Negros Island Region.",
        )
    )
    for row in rows.strip().splitlines():
        name, code, population = row.split("|")
        candidates = [
            c
            for c in centroids
            if bounds[0] <= c["lat"] <= bounds[1]
            and bounds[2] <= c["lon"] <= bounds[3]
            and (
                normalized(c["properties"]["shapeName"]) == normalized(name)
                or normalized(c["properties"]["shapeName"]) == normalized(aliases.get(name, name))
            )
        ]
        if len(candidates) != 1:
            unmatched.append(
                dict(
                    name=name,
                    province=province,
                    code=code,
                    matches=[c["properties"]["shapeName"] for c in candidates],
                )
            )
            continue
        c = candidates[0]
        receptors.append(
            dict(
                id=code,
                name=f"{name}, {province}",
                kind="municipality",
                lat=c["lat"],
                lon=c["lon"],
                population=int(population),
                population_year=2024,
                source_ids=[sid, "boundaries"],
                coordinate_role="2020 ADM3 simplified polygon equal-area centroid",
            )
        )

receptors += [
    dict(
        id="RPLL",
        name="Ninoy Aquino International Airport",
        kind="airport",
        lat=14 + 30 / 60 + 35.78 / 3600,
        lon=121 + 49.892 / 3600,
        population=None,
        population_year=None,
        source_ids=["caap-naia"],
        coordinate_role="aerodrome reference point",
    ),
    dict(
        id="RPLK",
        name="Bicol International Airport",
        kind="airport",
        lat=13 + 6 / 60 + 46 / 3600,
        lon=123 + 40 / 60 + 40 / 3600,
        population=None,
        population_year=None,
        source_ids=["caap-bicol"],
        coordinate_role="aerodrome reference point",
    ),
]
volcanoes = [
    dict(
        id="taal",
        name="Taal",
        lat=14.0106,
        lon=120.9975,
        elevation_m=311,
        profile="caldera",
        source_ids=["gvp-taal"],
        illustration_notes="Lake caldera and coalescing island cones; schematic profile, not terrain.",
    ),
    dict(
        id="mayon",
        name="Mayon",
        lat=13.257,
        lon=123.685,
        elevation_m=2462,
        profile="cone",
        source_ids=["gvp-mayon"],
        illustration_notes="Conical stratovolcano; schematic symmetrical silhouette.",
    ),
    dict(
        id="kanlaon",
        name="Kanlaon",
        lat=10.4096,
        lon=123.13,
        elevation_m=2422,
        profile="stratovolcano",
        source_ids=["gvp-kanlaon"],
        illustration_notes="Elongated northern caldera and higher southern active summit; schematic.",
    ),
]
scenarios = []
for v in volcanoes:
    scenario = dict(
        volcano_id=v["id"],
        label=f"{v['name']} illustrative teaching scenario",
        input_status="illustrative",
        source_ids=v["source_ids"] + ["assumptions"],
        vent_lat=v["lat"],
        vent_lon=v["lon"],
        vent_elevation_m=v["elevation_m"],
        column_height_m=5000,
        mass_rate_kg_s=10000,
        duration_s=3600,
        wind_speed_m_s=10,
        wind_from_deg=225,
        diffusivity_m2_s=500,
        initial_spread_m=250,
        bulk_density_kg_m3=1000,
        grains=[
            dict(diameter_um=d, fraction=w, settling_speed_m_s=s)
            for d, w, s in zip(
                [32, 63, 125, 250, 500],
                [0.1, 0.15, 0.25, 0.3, 0.2],
                [0.05, 0.2, 0.8, 3, 10],
                strict=True,
            )
        ],
        domain_km=200,
        cell_km=1,
        release_layers=16,
    )
    scenarios.append(
        dict(
            id=v["id"] + "-teaching",
            name=scenario["label"],
            status="illustrative",
            scenario=scenario,
        )
    )

catalog = dict(
    revision="2026-10-10-curation-2",
    sources=sources,
    volcanoes=volcanoes,
    scenarios=scenarios,
    receptors=receptors,
    criteria=[],
    winds=[
        dict(
            id="amihan",
            name="Amihan plume-level wind",
            status="unavailable",
            speed_m_s=None,
            from_deg=None,
            source_ids=["pagasa"],
        ),
        dict(
            id="habagat",
            name="Habagat plume-level wind",
            status="unavailable",
            speed_m_s=None,
            from_deg=None,
            source_ids=["pagasa"],
        ),
    ],
    historical=dict(
        available=False,
        reason="Historical numerical evaluation requires reviewed effective winds, ash mass and geolocated held-out observations. Published isopach area discrepancies remain unresolved.",
        scenario=None,
        observations=[],
        blocked_inputs=[
            "Effective historical wind speed, altitude and averaging period",
            "Mass conversion: erupted deposit volume is not modeled ash mass without reviewed density and exclusions",
            "Representative grain fractions and settling speeds",
            "Calibrated diffusivity and initial spread",
            "Geolocated evaluation observations or digitized footprint independent of calibration",
            "2020 populations for selected historical receptors",
            "Resolve 0.5 mm footprint area discrepancy: 8605 km2 narrative versus 3864.89 km2 Table 3",
        ],
        reference_tables=[
            dict(
                title="Published Table 3 isopach areas (not spatial geometry)",
                source_id="taal-study",
                original_units="cm and km2",
                thickness_mm=[450, 100, 15, 5, 3, 1, 0.5],
                enclosed_area_km2=[22.9, 123.24, 436.77, 764.24, 1107.91, 2285.22, 3864.89],
            ),
            dict(
                title="Published plume and volume references",
                source_id="taal-study",
                observed_plume_asl_m=[17000, 21000],
                height_above_profile_ground_m=[16689, 20689],
                conversion="ASL minus 311 m profile elevation; not a surveyed vent datum",
                inferred_height_above_vent_m=17800,
                volume_estimates_km3=dict(exponential=0.057, power_law=0.042, weibull=0.090),
                narrative_reporting_footprint_km2=8605,
                notes="The inferred height above vent is a separate value from observed ASL height. Volume estimates depend on fit method; base-surge deposit excluded.",
            ),
        ],
    ),
    coverage_notes=f"Partial receptor coverage: {len(receptors) - 2} manually matched municipalities in five provinces plus two airport reference points. Not a complete national or regional inventory. Population totals are indicative centroid screens, not population within an ash polygon. Missing roof/crop/facility criteria are unknown, not safe.",
    unmatched_transcriptions=unmatched,
)
from curate_gap_inputs import enrich_catalog  # noqa: E402

catalog = enrich_catalog(catalog)

(ROOT / "data/catalog.json").write_text(
    json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)
(ROOT / "data/examples").mkdir(exist_ok=True)
for preset in scenarios:
    (ROOT / "data/examples" / (preset["id"] + ".json")).write_text(
        json.dumps(dict(scenario=preset["scenario"]), indent=2) + "\n", encoding="utf-8"
    )
print(f"Catalog: {len(catalog['receptors'])} receptors; unmatched: {unmatched}")
