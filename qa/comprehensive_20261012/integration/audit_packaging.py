"""Production serving, packaged hashes and installed-environment evidence."""

import hashlib
import json
import platform
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
BASE = "http://127.0.0.1:8012"


def digest(payload):
    return hashlib.sha256(payload).hexdigest()


def request(path):
    try:
        with urlopen(BASE + path, timeout=20) as response:
            return response.status, response.headers.get("Content-Type"), response.read()
    except HTTPError as exc:
        return exc.code, exc.headers.get("Content-Type"), exc.read()


def main():
    checks = []
    for path, expected in [
        ("/", 200),
        ("/workspace", 200),
        ("/api/health", 200),
        ("/api/catalog", 200),
        ("/api/openapi.json", 200),
        ("/api", 404),
        ("/api/missing", 404),
        ("/assets/missing.js", 404),
        ("/.env", 404),
        ("/backend/uv.lock", 404),
        ("/data/catalog.json", 404),
        ("/documentation/../AGENTS.md", 404),
        ("/documentation/%2E%2E/AGENTS.md", 404),
        ("/documentation/ABO_RESEARCH_IMRAD.docx", 200),
        ("/documentation/COMPUTATION.md", 200),
    ]:
        status, content_type, payload = request(path)
        checks.append(
            {
                "path": path,
                "status": status,
                "expected": expected,
                "content_type": content_type,
                "bytes": len(payload),
                "sha256": digest(payload),
            }
        )
        assert status == expected, checks[-1]
        if path == "/api/health":
            assert json.loads(payload)["validation_status"] == "not_historically_validated"
        if path == "/api/catalog":
            local = json.loads((ROOT / "data/catalog.json").read_text(encoding="utf-8"))
            data = json.loads(payload)
            assert data["revision"] == local["revision"]
            assert len(data["receptors"]) == 320
        if path == "/documentation/ABO_RESEARCH_IMRAD.docx":
            assert digest(payload) == digest((ROOT / "docs/ABO_RESEARCH_IMRAD.docx").read_bytes())
    manifest = json.loads((ROOT / "data/source/terrain/manifest.json").read_text(encoding="utf-8"))
    assets = []
    for record in manifest["terrain"]:
        target = ROOT / record["file"]
        sha256 = digest(target.read_bytes())
        assert sha256 == record["sha256"], target
        url_path = "/" + target.relative_to(ROOT / "frontend/public").as_posix()
        status, _, payload = request(url_path)
        assert status == 200 and digest(payload) == sha256
        assets.append({"file": record["file"], "sha256": sha256, "served_bytes_match": True})
    context = ROOT / "frontend/public/geography-context.geojson"
    sha256 = digest(context.read_bytes())
    assert sha256 == manifest["geography_context_sha256"]
    status, _, payload = request("/geography-context.geojson")
    assert status == 200 and digest(payload) == sha256
    assets.append(
        {"file": context.relative_to(ROOT).as_posix(), "sha256": sha256, "served_bytes_match": True}
    )
    build = [
        {
            "file": path.relative_to(ROOT).as_posix(),
            "sha256": digest(path.read_bytes()),
            "bytes": path.stat().st_size,
        }
        for path in sorted((ROOT / "frontend/dist/assets").iterdir())
        if path.is_file()
    ]
    result = {
        "reviewer": "root integration QA",
        "at_utc": datetime.now(UTC).isoformat(),
        "base_url": BASE,
        "platform": platform.platform(),
        "python": sys.version,
        "git_baseline": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip(),
        "http_checks": checks,
        "packaged_hash_checks": assets,
        "build_assets": build,
        "limits": (
            "Local serving and asset checks, not a security penetration test "
            "or historical validation. Optional ignored raw terrain caches "
            "were not downloaded or re-curated."
        ),
    }
    (OUT / "packaging.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"http_checks": len(checks), "asset_hashes": len(assets), "status": "PASS"}))


if __name__ == "__main__":
    main()
