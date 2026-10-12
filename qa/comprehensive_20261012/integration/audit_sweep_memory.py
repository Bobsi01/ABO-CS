"""Fresh-process traced allocation for the largest accepted sweep contract."""

import json
import platform
import time
import tracemalloc
from pathlib import Path

from abo_api import kernel, service
from abo_api.contracts import Receptor, SimulationRequest


def main():
    data = service.catalog()
    scenario = data.scenarios[0].scenario.model_copy(
        update={"release_layers": 32, "domain_km": 400, "cell_km": 1}
    )
    # Synthetic equal-coordinate receptors exercise the maximum resource count;
    # no population or real administrative inventory is fabricated.
    receptors = [
        Receptor(id=str(index), name="Synthetic memory receptor", lat=14, lon=121)
        for index in range(2048)
    ]
    estimate = kernel.check_budget(160, 400, 2048, kernel.SWEEP_DIRECTION_BATCH)
    request = SimulationRequest(scenario=scenario, receptors=receptors)
    tracemalloc.start()
    started = time.perf_counter()
    result = service.sweep(request)
    elapsed = time.perf_counter() - started
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    assert len(result.receptors) == 2048 and peak < kernel.MEMORY_LIMIT_BYTES
    evidence = {
        "platform": platform.platform(),
        "python": platform.python_version(),
        "components": 160,
        "receptors": 2048,
        "grid_cells_per_axis": 400,
        "candidate_bearings": 360,
        "batch_bearings": kernel.SWEEP_DIRECTION_BATCH,
        "estimated_working_bytes": estimate,
        "tracemalloc_peak_bytes": peak,
        "elapsed_s": elapsed,
        "limit_bytes": kernel.MEMORY_LIMIT_BYTES,
        "scope": "Python/NumPy traced allocation, not total OS RSS or GPU memory",
    }
    output = Path(__file__).resolve().parent / "sweep-memory.json"
    output.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence))


if __name__ == "__main__":
    main()
