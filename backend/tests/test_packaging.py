"""Packaged SPA fallback must not turn missing API routes into successful HTML."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from abo_api.main import WorkspaceFiles


def test_spa_fallback_excludes_api_prefix_and_missing_assets(tmp_path):
    (tmp_path / "index.html").write_text("<html>ABO workspace</html>", encoding="utf-8")
    app = FastAPI()
    app.mount("/", WorkspaceFiles(directory=tmp_path, html=True))
    client = TestClient(app)

    for path in ("/", "/workspace", "/apiary"):
        response = client.get(path)
        assert response.status_code == 200
        assert "ABO workspace" in response.text

    for path in ("/api", "/api/", "/api/missing", "/api/missing.json", "/missing.js"):
        assert client.get(path).status_code == 404
