"""Capture current API behavior; output is explicitly supplied to preserve history."""

import json
import subprocess
import sys
import types
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from abo_api import service
from abo_api.contracts import SimulationRequest
from abo_api.main import app

data = service.catalog()
client = TestClient(app)
cases = []
implementation = service
source_revision = "working-tree"
if "--original-head" in sys.argv:
    source_revision = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    original_kernel = types.ModuleType("independent_original_kernel")
    original_service = types.ModuleType("independent_original_service")
    for module, filename in (
        (original_kernel, "backend/src/abo_api/kernel.py"),
        (original_service, "backend/src/abo_api/service.py"),
    ):
        module.__file__ = str(Path(filename).resolve())
        source = subprocess.check_output(["git", "show", f"HEAD:{filename}"], text=True)
        exec(compile(source, module.__file__, "exec"), module.__dict__)
    original_service.kernel = original_kernel
    implementation = original_service
with patch.object(service, "sweep", implementation.sweep):
    for preset in data.scenarios:
        response = client.post(
            "/api/wind-sweeps", json=SimulationRequest(scenario=preset.scenario).model_dump()
        )
        body = response.json()
        cases.append(
            {
                "preset": preset.id,
                "status": response.status_code,
                "detail": body.get("detail"),
                "returned_receptors": len(body.get("receptors", [])),
                "step_deg": body.get("step_deg"),
            }
        )
report = {
    "implementation_revision": source_revision,
    "dataset_revision": data.revision,
    "catalog_receptor_count": len(data.receptors),
    "legacy_all_bearings_estimated_bytes": 8 * (8 * 360 * 80 * 320 + 12 * 200**2 + 12 * 80 * 201),
    "cases": cases,
}
Path(sys.argv[1]).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
