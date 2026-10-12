"""Render the authoritative local parameter-evidence register as readable Markdown."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def text(value):
    if value is None:
        return "Unavailable"
    if isinstance(value, list):
        return ", ".join(str(v) for v in value)
    return str(value).replace("|", "\\|").replace("\n", " ")


def main():
    catalog = json.loads((ROOT / "data/catalog.json").read_text(encoding="utf-8"))
    sources = {s["id"]: s for s in catalog["sources"]}
    parameters = catalog["parameter_evidence"]
    lines = [
        "# Parameter evidence register",
        "",
        f"Revision: `{catalog['revision']}`. Reproduce with "
        "`uv run python ../scripts/build_parameter_register.py` from `backend/` "
        "after the catalog build.",
        "",
        "The authoritative records are `data/source/gap-evidence-register.json`, exposed through "
        "`GET /api/catalog`. **Usable** means usable for the explicitly stated purpose, "
        "not empirical validation. A missing measured value is a required measurement "
        "category with no accepted value. **Illustrative** values are assumptions or "
        "engineering choices. No parameter is currently calibrated.",
        "",
        "Frozen retrospective case: 12 January 2020 13:00 to 13 January 04:28 local (UTC+8), "
        "55,680 s. The numerical solver is available; historical agreement is not established. "
        "Methodological approval of `taal-main-plume-2020-v1` does not approve "
        "missing physical inputs.",
        "",
        "| Parameter | Class | Value | Units | Readiness |",
        "| --- | --- | --- | --- | --- |",
    ]
    for p in parameters:
        lines.append(
            "| "
            + " | ".join(
                text(p[k]) for k in ("parameter", "classification", "value", "units", "readiness")
            )
            + " |"
        )
    lines += ["", "## Datum, uncertainty, provenance and dependencies", ""]
    for p in parameters:
        links = ", ".join(
            f"[{id}]({sources[id]['url']})" if id in sources else id for id in p["source_ids"]
        )
        lines += [
            f"### {p['parameter']}",
            "",
            f"`{p['id']}` — {p['classification']}; {p['readiness']}. "
            f"Value: {text(p['value'])} {p['units']}.",
            "",
            f"Datum: {p['datum']}. Uncertainty: {p['uncertainty']}.",
            "",
            f"Source: {links}. Locator: {p['locator']}. License: {p['license']}.",
            "",
            f"Conversions: {p['conversions']}. Dependencies: "
            f"{', '.join(p['dependencies']) or 'none recorded'}.",
            "",
            p["notes"],
            "",
        ]
    lines += [
        "## Frozen source-gate findings",
        "",
        "Both selected Tanay launches provide 15/21 interpolable height-grid positions (71.43%), "
        "below the frozen 75% requirement. No effective historical wind is accepted. Raw records, "
        "processing flags, vectors and hashes are retained in `data/source/igra/`.",
        "",
        "Two independent manual traces of the published 0.5 mm contour are accepted as derived "
        "reference geometry. They share one observation family and contribute zero independent "
        "thickness observations. Their intertrace IoU is a digitization repeatability measure, "
        "not model agreement. Both complete and clipped areas are retained, along with the "
        "unresolved 8,605 versus 3,864.89 km² published area statements.",
        "",
        "318 municipality/city receptors and two airports are available. 34 Batangas receptors "
        "have 2020 counts; others have explicit missing historical counts. Inventory inclusion, "
        "unresolved polygons and current/correspondence codes are recorded separately from "
        "centroid exposure. Current correspondence codes do not establish "
        "historical boundary stability.",
        "",
        "Source terms are recorded per publisher. PSA original national downloads and the "
        "Batangas PDF direct download were unavailable; archived source-line extracts and manual "
        "transcriptions are disclosed rather than represented as original files.",
        "",
        "See [EVALUATION_PROTOCOL.md](EVALUATION_PROTOCOL.md), [INPUT_VALUES.md](INPUT_VALUES.md), "
        "[COMPUTATION.md](COMPUTATION.md), `data/source/gap-curation-manifest.json`, "
        "`data/source/taal-study/manifest.json` and `data/source/domain-inventory.json`.",
        "",
    ]
    (ROOT / "docs/PARAMETER_REGISTER.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Documented {len(parameters)} evidence records")


if __name__ == "__main__":
    main()
