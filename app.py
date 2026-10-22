"""Vercel entry point; retain the existing backend source and curated asset paths."""

import sys
from importlib import import_module
from pathlib import Path

from starlette.middleware.gzip import GZipMiddleware

sys.path.insert(0, str(Path(__file__).resolve().parent / "backend" / "src"))

app = import_module("abo_api.main").app
app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=6)
