"""Compare archived pre-repair catalog with current UTF-8 curation."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / "qa/current_review"


def main():
    old = json.loads((HERE / "science-catalog-before.json").read_text(encoding="utf-8"))["catalog"]
    source = ROOT / "data/catalog.json"
    new = json.loads(source.read_text(encoding="utf-8"))
    changes = []

    def compare(a, b, path):
        if type(a) is not type(b):
            changes.append({"path": path, "before": a, "after": b, "kind": "type"})
        elif isinstance(a, dict):
            if set(a) != set(b):
                changes.append({"path": path, "kind": "keys"})
            for key in sorted(a.keys() & b.keys()):
                compare(a[key], b[key], f"{path}.{key}")
        elif isinstance(a, list):
            if len(a) != len(b):
                changes.append({"path": path, "kind": "length"})
            for i, (left, right) in enumerate(zip(a, b, strict=False)):
                compare(left, right, f"{path}[{i}]")
        elif a != b:
            changes.append(
                {
                    "path": path,
                    "before": a,
                    "after": b,
                    "kind": "text" if isinstance(a, str) else "numeric",
                }
            )

    compare(old, new, "catalog")
    result = {
        "before_revision": old["revision"],
        "after_revision": new["revision"],
        "current_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "changes": changes,
        "non_text_changes": [c for c in changes if c["kind"] != "text"],
        "scientific_inputs_unchanged": old["scenarios"] == new["scenarios"],
        "receptors_unchanged": old["receptors"] == new["receptors"],
        "criteria_unchanged": old["criteria"] == new["criteria"],
    }
    (HERE / "science-catalog-diff.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(result, indent=2))
    assert not result["non_text_changes"]
    assert (
        result["scientific_inputs_unchanged"]
        and result["receptors_unchanged"]
        and result["criteria_unchanged"]
    )


if __name__ == "__main__":
    main()
