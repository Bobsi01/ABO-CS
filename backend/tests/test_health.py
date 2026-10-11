from fastapi.testclient import TestClient

from abo_api.main import app

client = TestClient(app)


def test_health_contract_separates_implemented_solver_from_validation():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ABO",
        "version": "1.0.0",
        "model_status": "implemented",
        "validation_status": "not_historically_validated",
    }


def test_openapi_exposes_typed_health_contract():
    schema = client.get("/api/openapi.json").json()

    operation = schema["paths"]["/api/health"]["get"]
    assert operation["operationId"] == "getHealth"
    assert operation["responses"]["200"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/HealthResponse"
    }
