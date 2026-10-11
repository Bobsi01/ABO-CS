"""Reproducible synthetic API benchmark; no claim about historical accuracy/GPU.

Run from backend: uv run python ../qa/benchmark.py
Reports wall time and Python/NumPy traced allocation peak, not total OS RSS.
"""

import json
import platform
import time
import tracemalloc

from fastapi.testclient import TestClient
from test_independent import request

from abo_api import service
from abo_api.contracts import Catalog
from abo_api.main import app


def main():
    service.catalog = lambda: Catalog(
        revision="qa-synthetic-benchmark",
        sources=[],
        volcanoes=[],
        scenarios=[],
        winds=[],
        receptors=[],
        criteria=[],
        historical={"available": False},
    )
    payload = request()
    payload["scenario"].update(
        domain_km=200,
        cell_km=1,
        release_layers=16,
        column_height_m=5000,
        wind_speed_m_s=10,
        diffusivity_m2_s=200,
        mass_rate_kg_s=1e5,
        duration_s=3600,
    )
    tracemalloc.start()
    started = time.perf_counter()
    response = TestClient(app).post("/api/simulations", json=payload)
    elapsed = time.perf_counter() - started
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    assert response.status_code == 200, response.text
    result = response.json()
    print(
        json.dumps(
            {
                "kind": "synthetic API benchmark; not eruption validation or GPU performance",
                "platform": platform.platform(),
                "python": platform.python_version(),
                "cells": len(result["grid"]["east_m"]) ** 2,
                "grains": len(payload["scenario"]["grains"]),
                "release_layers": payload["scenario"]["release_layers"],
                "wall_time_s": elapsed,
                "python_numpy_traced_peak_bytes": peak,
                "estimated_working_bytes": result["diagnostics"]["estimated_working_bytes"],
                "server_elapsed_ms": result["diagnostics"]["elapsed_ms"],
                "retained_fraction": result["diagnostics"]["retained_fraction"],
                "serialized_response_bytes": len(response.content),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
