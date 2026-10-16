"""Export the backend's actual schema for the frontend type generator."""

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "backend" / "src"))

from abo_api.main import app  # noqa: E402

output_path = PROJECT_ROOT / "frontend" / "openapi.json"
output_path.write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"Exported {output_path}")
