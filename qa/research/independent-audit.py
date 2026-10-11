"""Read-only independent manuscript checks; never rewrites deliverable artifacts."""

from __future__ import annotations

import hashlib
import json
import math
import re
import urllib.request
from pathlib import Path
from zipfile import ZipFile

from lxml import etree
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
DOCX = ROOT / "docs/ABO_RESEARCH_IMRAD.docx"
PDF = ROOT / "qa/research/rendered/ABO_RESEARCH_IMRAD.pdf"
NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
}


def attr(element, name):
    return None if element is None else element.get(f"{{{NS['w']}}}{name}")


def normalized(value):
    return "".join(value.split())


def mathematical_text(node):
    tag = etree.QName(node).localname
    children = list(node)
    if tag == "t":
        return node.text or ""
    if tag == "f":
        return f"({mathematical_text(children[0])})/({mathematical_text(children[1])})"
    if tag in {"sSub", "sSup"}:
        marker = "_" if tag == "sSub" else "^"
        return f"({mathematical_text(children[0])}){marker}({mathematical_text(children[1])})"
    return "".join(mathematical_text(child) for child in children)


def normal_interval(low, high):
    root2 = math.sqrt(2)
    if low >= 0:
        return 0.5 * (math.erfc(low / root2) - math.erfc(high / root2))
    return 0.5 * (math.erfc(-high / root2) - math.erfc(-low / root2))


def main():
    with ZipFile(DOCX) as package:
        document = etree.fromstring(package.read("word/document.xml"))
        styles = etree.fromstring(package.read("word/styles.xml"))
        parts = {
            name: package.read(name)
            for name in package.namelist()
            if name.startswith("word/") and name.endswith(".xml")
        }
    reader = PdfReader(PDF)
    extracted_pages = [page.extract_text() for page in reader.pages]
    render = normalized("".join(extracted_pages))
    cleaned_pages = [
        re.sub(
            r"^Evaluation Only\. Created with Aspose\.Words\. "
            r"Copyright 2003-2026 Aspose Pty\s+Ltd\.\s+\d+\s+",
            "",
            page,
        )
        for page in extracted_pages
    ]
    # Only the known renderer-added footer/page prefix is removed in memory.
    # PDF/PNG artifacts and the source DOCX remain unchanged.
    clean_render = normalized("".join(cleaned_pages))
    issues = []
    runs_checked = 0
    checked_prose = 0
    missing_prose = []
    raw_extraction_misses = []
    headings = []
    for paragraph in document.xpath("//w:body//w:p", namespaces=NS):
        style = attr(paragraph.find("w:pPr/w:pStyle", NS), "val")
        expected = 24 if style in {"Title", "Heading1", "Heading2"} else 22
        row = paragraph.getparent().getparent()
        if etree.QName(row).localname == "tr" and row.find("w:trPr/w:tblHeader", NS) is not None:
            expected = 24
        text = "".join(paragraph.xpath(".//w:t/text()", namespaces=NS))
        if style == "Heading1":
            headings.append(text)
        if text.strip() and not paragraph.xpath("./m:oMath", namespaces=NS):
            checked_prose += 1
            if normalized(text) not in render:
                raw_extraction_misses.append(text)
            if normalized(text) not in clean_render:
                missing_prose.append(text)
        for run in paragraph.xpath(".//w:r|.//m:r", namespaces=NS):
            size = attr(run.find("w:rPr/w:sz", NS), "val")
            font = run.find("w:rPr/w:rFonts", NS)
            families = {attr(font, axis) for axis in ("ascii", "hAnsi", "eastAsia", "cs")}
            runs_checked += 1
            if size != str(expected) or families != {"Arial"}:
                issues.append(
                    {
                        "text": text[:90],
                        "size_half_points": size,
                        "fonts": list(families),
                    }
                )
    borders = styles.xpath("//w:style[@w:styleId='Title']/w:pPr/w:pBdr", namespaces=NS)
    equations = [mathematical_text(node) for node in document.xpath("//m:oMath", namespaces=NS)]
    fonts = set()
    for page in reader.pages:
        for resource in page["/Resources"].get_object().get("/Font", {}).values():
            fonts.add(str(resource.get_object().get("/BaseFont")))
    request_path = ROOT / "data/examples/mayon-eruption-request.json"
    payload = request_path.read_bytes()
    request = json.loads(payload)
    scenario = request["simulation"]["scenario"]
    mass = scenario["mass_rate_kg_s"] * scenario["duration_s"]
    angle = math.radians(scenario["wind_from_deg"])
    wind_e = -scenario["wind_speed_m_s"] * math.sin(angle)
    wind_n = -scenario["wind_speed_m_s"] * math.cos(angle)
    half_width = scenario["domain_km"] * 500
    layers = scenario["release_layers"]
    inside = 0.0
    max_fall = 0.0
    for grain in scenario["grains"]:
        for layer in range(layers):
            height = scenario["column_height_m"] * (layer + 0.5) / layers
            fall = height / grain["settling_speed_m_s"]
            max_fall = max(max_fall, fall)
            sigma = math.sqrt(
                scenario["initial_spread_m"] ** 2 + 2 * scenario["diffusivity_m2_s"] * fall
            )
            probability = normal_interval(
                (-half_width - wind_e * fall) / sigma,
                (half_width - wind_e * fall) / sigma,
            )
            probability *= normal_interval(
                (-half_width - wind_n * fall) / sigma,
                (half_width - wind_n * fall) / sigma,
            )
            inside += mass * grain["fraction"] / layers * probability
    synthetic_point = 100_000 / (2 * math.pi * 1_000**2)
    synthetic_cell = 100_000 * math.erf(500 / (1_000 * math.sqrt(2))) ** 2
    http_request = urllib.request.Request(
        "http://127.0.0.1:8000/api/eruption-sequences",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(http_request, timeout=60) as response:
        result = json.load(response)
    final = result["frames"][-1]
    report = {
        "role": "independent read-only DOCX and research audit",
        "docx_sha256": hashlib.sha256(DOCX.read_bytes()).hexdigest(),
        "pdf_sha256": hashlib.sha256(PDF.read_bytes()).hexdigest(),
        "run_count": runs_checked,
        "direct_typography_issues": issues,
        "main_headings": headings,
        "tables": len(document.xpath("//w:tbl", namespaces=NS)),
        "prose_and_cell_paragraphs_checked": checked_prose,
        "missing_from_pdf_text": missing_prose,
        "raw_extraction_cross_page_misses": len(raw_extraction_misses),
        "rendered_pages": len(reader.pages),
        "rendered_fonts": sorted(fonts),
        "editable_equations": equations,
        "title_style_has_border": bool(borders),
        "source_evaluation_text_present": any(
            re.search(rb"Aspose|Evaluation Only|evaluation copy", part, re.IGNORECASE)
            for part in parts.values()
        ),
        "tracked_changes": len(document.xpath("//w:ins|//w:del", namespaces=NS)),
        "comment_anchors": len(document.xpath("//w:commentRangeStart", namespaces=NS)),
        "synthetic_point_kg_m2": synthetic_point,
        "synthetic_cell_mass_kg": synthetic_cell,
        "scalar_expected_final_elapsed_s": scenario["duration_s"] + max_fall,
        "scalar_expected_emitted_mass_kg": mass,
        "scalar_expected_inside_mass_kg": inside,
        "scalar_expected_outside_mass_kg": mass - inside,
        "live_frame_count": len(result["frames"]),
        "live_final_elapsed_s": final["elapsed_s"],
        "live_final_diagnostics": final["diagnostics"],
        "live_lava_stop": result["lava"]["stop_reason"],
        "mass_scalar_api_difference_kg": inside - final["diagnostics"]["inside_domain_mass_kg"],
    }
    target = ROOT / "qa/research/independent-evidence.json"
    target.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=True))


if __name__ == "__main__":
    main()
