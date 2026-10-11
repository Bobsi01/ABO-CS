"""Exercise real FastAPI routes against curated inputs without mutating them."""

import hashlib
import json
from pathlib import Path

from fastapi.testclient import TestClient

from abo_api.main import app

ROOT = Path(__file__).resolve().parents[2]


def main():
    with TestClient(app) as client:
        health = client.get("/api/health")
        assert health.status_code == 200
        assert health.json()["validation_status"] == "not_historically_validated"
        response = client.get("/api/catalog")
        assert response.status_code == 200
        catalog = response.json()
        assert len({row["id"] for row in catalog["receptors"]}) == len(catalog["receptors"])
        assert len(catalog["historical"]["reference_footprints"]) == 2
        assert catalog["historical"]["footprint_evidence"]["independent_observation_count"] == 0
        parameters = {row["id"]: row for row in catalog["parameter_evidence"]}
        assert parameters["event-duration"]["value"] == 55680
        assert parameters["wind-effective"]["value"] is None
        assert parameters["wind-effective"]["readiness"] == "source_blocked"
        assert parameters["observation-geometry"]["readiness"] == "usable"
        for row in parameters.values():
            assert all(
                row[key]
                for key in (
                    "units",
                    "datum",
                    "uncertainty",
                    "locator",
                    "license",
                    "conversions",
                    "notes",
                )
            )
        historical_response = client.post("/api/replications/taal-2020", json={})
        assert historical_response.status_code == 200
        historical = historical_response.json()
        assert not historical["available"]
        assert historical["simulation"] is None
        assert historical["validation_status"] == "unavailable"
        assert historical["metrics"] == {}
        assert historical["protocol"]["review_status"] == "approved"
        assert len(historical["reference_footprints"]) == 2
        assert historical["blocked_inputs"]
        scenario = catalog["scenarios"][0]["scenario"]
        simulation_response = client.post(
            "/api/simulations",
            json={"scenario": scenario, "population_year": 2020, "screening_context": {}},
        )
        assert simulation_response.status_code == 200
        simulation = simulation_response.json()
        assert all(
            row["population_year"] == 2020
            and row["population"] == row.get("population_records", {}).get("2020")
            for row in simulation["receptors"]
            if row["kind"] == "municipality"
        )
        assert simulation["diagnostics"]["validation_status"] == "not_historically_validated"
        # No source-backed local damage criterion has been curated; absence is
        # preserved rather than treating the 0.5 mm reporting cutoff as damage.
        assert catalog["criteria"] == []
        assert all(
            all(row["screening"].get(key) == "unknown" for key in ("roof", "crop"))
            for row in simulation["receptors"]
        )
        invalid = client.post(
            "/api/simulations", json={"scenario": scenario, "population_year": 2021}
        )
        assert invalid.status_code == 422
    result = {
        "catalog_sha256": hashlib.sha256((ROOT / "data/catalog.json").read_bytes()).hexdigest(),
        "revision": catalog["revision"],
        "route_status": {
            "health": health.status_code,
            "catalog": response.status_code,
            "replication": historical_response.status_code,
            "simulation": simulation_response.status_code,
            "invalid_population_year": invalid.status_code,
        },
        "parameter_evidence_count": len(parameters),
        "historical": historical,
        "simulation_summary": simulation["summary"],
        "limit": (
            "API/data status verification and numerical synthetic tests do not establish "
            "empirical predictive accuracy."
        ),
    }
    (ROOT / "qa/gap_closure/independent-api.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps({key: value for key, value in result.items() if key != "historical"}, indent=2)
    )


if __name__ == "__main__":
    main()
