"""Export reproducible source-blocked historical evidence, without inventing a run."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend/src"))
from abo_api import service  # noqa: E402

if __name__ == "__main__":
    result = service.replication()
    if result.available or result.simulation is not None:
        raise ValueError("This export is the frozen source-blocked evidence record")
    output = result.model_dump(mode="json")
    output["catalog_sha256"] = hashlib.sha256((ROOT / "data/catalog.json").read_bytes()).hexdigest()
    path = ROOT / "data/examples/taal-evidence-status.json"
    path.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Exported unavailable historical status with {len(result.reference_footprints)} traces")
