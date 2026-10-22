"""Curate directional wind outcome scenarios for Taal 2020 simulation suite.

Reorders catalog scenarios so that Taal 2020 Regional Eruption is primary (1st),
followed by 6 directional wind outcome presets (North, South, East, West, Northeast, Northwest),
retaining the illustrative baseline scenarios (Taal 5 km, Mayon, Kanlaon) at the end.
"""

import json
from copy import deepcopy
from pathlib import Path

from abo_api.contracts import Catalog


def main() -> None:
    catalog_path = Path("data/catalog.json")
    with catalog_path.open("r", encoding="utf-8") as f:
        catalog_dict = json.load(f)

    existing_scenarios = {s["id"]: s for s in catalog_dict["scenarios"]}

    # 1. Update and prioritize taal-regional as 1st scenario
    taal_regional = existing_scenarios["taal-regional"]
    taal_regional["name"] = "Taal 2020 regional eruption (12–13 Jan actual event)"
    taal_regional["scenario"]["label"] = "Taal 2020 regional eruption (12–13 Jan actual event)"

    # Base parameters for directional outcomes (inherit from taal-regional source geometry)
    base_scenario = deepcopy(taal_regional["scenario"])
    base_scenario["wind_profile"] = None
    base_scenario["source_ids"] = ["gvp-taal", "taal-study", "assumptions"]

    directional_configs = [
        {
            "id": "taal-wind-north",
            "name": "Taal outcome: Wind blowing North (Southerly · 15 m/s)",
            "speed": 15.0,
            "wind_from_deg": 180.0,
        },
        {
            "id": "taal-wind-south",
            "name": "Taal outcome: Wind blowing South (Amihan / Northerly · 12 m/s)",
            "speed": 12.0,
            "wind_from_deg": 0.0,
        },
        {
            "id": "taal-wind-east",
            "name": "Taal outcome: Wind blowing East (Westerly · 12 m/s)",
            "speed": 12.0,
            "wind_from_deg": 270.0,
        },
        {
            "id": "taal-wind-west",
            "name": "Taal outcome: Wind blowing West (Easterly trade · 10 m/s)",
            "speed": 10.0,
            "wind_from_deg": 90.0,
        },
        {
            "id": "taal-wind-northeast",
            "name": "Taal outcome: Wind blowing Northeast (Habagat · 14 m/s)",
            "speed": 14.0,
            "wind_from_deg": 225.0,
        },
        {
            "id": "taal-wind-northwest",
            "name": "Taal outcome: Wind blowing Northwest (Southeasterly · 12 m/s)",
            "speed": 12.0,
            "wind_from_deg": 135.0,
        },
    ]

    directional_scenarios = []
    for cfg in directional_configs:
        sc = deepcopy(base_scenario)
        sc["label"] = cfg["name"]
        sc["wind_speed_m_s"] = cfg["speed"]
        sc["wind_from_deg"] = cfg["wind_from_deg"]
        directional_scenarios.append(
            {
                "id": cfg["id"],
                "name": cfg["name"],
                "status": "illustrative",
                "scenario": sc,
            }
        )

    # Reorder scenarios
    ordered_scenarios = [
        taal_regional,
        *directional_scenarios,
        existing_scenarios["taal-teaching"],
        existing_scenarios["mayon-teaching"],
        existing_scenarios["kanlaon-teaching"],
    ]

    catalog_dict["scenarios"] = ordered_scenarios

    # Validate catalog against Pydantic Catalog schema
    validated = Catalog.model_validate(catalog_dict)
    catalog_path.write_text(
        json.dumps(validated.model_dump(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Successfully updated data/catalog.json: {len(validated.scenarios)} scenarios written.")
    for i, s in enumerate(validated.scenarios):
        print(f"  [{i}] {s.id}: {s.name}")


if __name__ == "__main__":
    main()
