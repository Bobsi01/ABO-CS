from pathlib import Path
from threading import BoundedSemaphore
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict
from starlette.exceptions import HTTPException as StarletteHTTPException

from abo_api import eruption, service
from abo_api.contracts import (
    Catalog,
    EruptionRequest,
    EruptionSequence,
    ReplicationResult,
    SimulationRequest,
    SimulationResult,
    SweepResult,
)


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"]
    service: Literal["ABO"]
    version: str
    model_status: Literal["implemented"]
    validation_status: Literal["not_historically_validated"]


app = FastAPI(
    title="ABO local API",
    version="1.0.0",
    description="Academic analytical ashfall model. Not a PHIVOLCS hazard advisory.",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request, exc):
    # Raw JSON can contain nonstandard NaN/Infinity. Never echo those values into
    # a strict JSON response while reporting the finite-input validation failure.
    errors = [
        {"loc": error["loc"], "msg": error["msg"], "type": error["type"]} for error in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})


@app.get("/api/health", response_model=HealthResponse, operation_id="getHealth", tags=["health"])
def health() -> HealthResponse:
    # App status keeps connectivity separate from historical validation.
    return HealthResponse(
        status="ok",
        service="ABO",
        version=app.version,
        model_status="implemented",
        validation_status="not_historically_validated",
    )


compute_slot = BoundedSemaphore(1)


def bounded_compute(function, *args):
    # We allow one computation at a time to limit peak memory use.
    if not compute_slot.acquire(blocking=False):
        raise HTTPException(
            status_code=429, detail="A computation is running. Retry when it finishes."
        )
    try:
        return function(*args)
    except service.CatalogUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        compute_slot.release()


@app.get("/api/catalog", response_model=Catalog, operation_id="getCatalog", tags=["inputs"])
def get_catalog():
    # For loading curated local inputs and labeled teaching scenarios.
    try:
        return service.catalog()
    except service.CatalogUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post(
    "/api/simulations",
    response_model=SimulationResult,
    operation_id="runSimulation",
    tags=["science"],
)
def run_simulation(request: SimulationRequest):
    return bounded_compute(service.simulate, request)


@app.post(
    "/api/wind-sweeps", response_model=SweepResult, operation_id="runWindSweep", tags=["science"]
)
def run_wind_sweep(request: SimulationRequest):
    return bounded_compute(service.sweep, request)


@app.post(
    "/api/replications/taal-2020",
    response_model=ReplicationResult,
    operation_id="runTaalReplication",
    tags=["science"],
)
def run_taal_replication():
    return bounded_compute(service.replication)


@app.post(
    "/api/eruption-sequences",
    response_model=EruptionSequence,
    operation_id="runEruptionSequence",
    tags=["science"],
)
def run_eruption_sequence(request: EruptionRequest):
    return bounded_compute(eruption.sequence, request)


# Project documentation and built React assets share the localhost origin.
documentation = Path(__file__).resolve().parents[3] / "docs"
if documentation.is_dir():
    app.mount("/documentation", StaticFiles(directory=documentation), name="documentation")


class WorkspaceFiles(StaticFiles):
    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            normalized_path = path.replace("\\", "/").lstrip("/")
            api_path = normalized_path == "api" or normalized_path.startswith("api/")
            if exc.status_code != 404 or api_path or "." in Path(normalized_path).name:
                raise
            return FileResponse(self.directory / "index.html")


frontend_dist = Path(__file__).resolve().parents[3] / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", WorkspaceFiles(directory=frontend_dist, html=True), name="workspace")
