"""Check manuscript completeness and distinguish QA renders from the DOCX."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile

from docx import Document
from docx.oxml.ns import qn
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "docs" / "ABO_RESEARCH_IMRAD.docx"
PDF = ROOT / "qa" / "research" / "rendered" / "ABO_RESEARCH_IMRAD.pdf"
OUTPUT = ROOT / "qa" / "research" / "content-audit.json"


def normalized(text):
    return re.sub(r"\s+", "", text)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, default=PDF)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    pdf = args.pdf.resolve()
    document = Document(DOCX)
    reader = PdfReader(pdf)
    # Strip only verified per-page footer prefixes from extracted text, never
    # from the PDF. Word extracts its PAGE footer before the body of each page.
    extracted = []
    removed_page_prefixes = []
    for index, page in enumerate(reader.pages, start=1):
        text = re.sub(
            r"^Evaluation Only\. Created with Aspose\.Words\. Copyright "
            r"2003-2026 Aspose Pty\s+Ltd\.\s+\d+\s+",
            "",
            page.extract_text(),
        )
        prefix = rf"^{index}\s+\n"
        if re.match(prefix, text):
            removed_page_prefixes.append(index)
            text = re.sub(prefix, "", text, count=1)
        extracted.append(text)
    rendered = normalized("".join(extracted))
    paragraphs = [
        paragraph
        for paragraph in document.paragraphs
        if paragraph.text.strip() and paragraph._p.find(qn("m:oMath")) is None
    ]
    paragraphs.extend(
        paragraph
        for table in document.tables
        for row in table.rows
        for cell in row.cells
        for paragraph in cell.paragraphs
        if paragraph.text.strip()
    )
    missing = [
        paragraph.text for paragraph in paragraphs if normalized(paragraph.text) not in rendered
    ]
    fonts = set()
    for page in reader.pages:
        fonts.update(
            str(value.get_object().get("/BaseFont"))
            for value in page["/Resources"]["/Font"].get_object().values()
        )
    with ZipFile(DOCX) as archive:
        source_xml = "".join(
            archive.read(name).decode("utf-8")
            for name in archive.namelist()
            if name.endswith(".xml")
        )
    markings = "Aspose" in source_xml or "Evaluation Only" in source_xml
    result = {
        "docx_sha256": hashlib.sha256(DOCX.read_bytes()).hexdigest(),
        "pdf": str(pdf.relative_to(ROOT)),
        "pdf_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(),
        "rendered_pages": len(reader.pages),
        "checked_prose_and_cell_paragraphs": len(paragraphs),
        "missing_from_render": missing,
        "page_footer_prefixes_removed_from_text_comparison": removed_page_prefixes,
        "rendered_fonts": sorted(fonts),
        "only_arial_rendered": all("Arial" in name for name in fonts),
        "source_contains_evaluation_markings": markings,
        "native_equations": source_xml.count("<m:oMath>"),
        "native_fractions": source_xml.count("<m:f>"),
        "pdf_has_structure_tree": bool(reader.trailer["/Root"].get("/StructTreeRoot")),
        "pdf_marked": bool(reader.trailer["/Root"].get("/MarkInfo", {}).get("/Marked")),
        "accessibility_limit": "Tagged output is not a native accessibility or screen-reader pass",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    if missing or markings or not result["only_arial_rendered"]:
        raise ValueError("Manuscript content/font check failed; inspect the audit")


if __name__ == "__main__":
    main()
