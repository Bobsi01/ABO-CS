"""Read-only current manuscript/source audit; run with bundled artifact Python."""

import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile

from docx import Document
from docx.oxml.ns import qn
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "qa/current_review/science-document.json"
DOCX = ROOT / "docs/ABO_RESEARCH_IMRAD.docx"
PDF = ROOT / "qa/current_review/word/ABO_RESEARCH_IMRAD.pdf"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalized(text):
    return re.sub(r"\s+", "", text)


def main():
    doc = Document(DOCX)
    pdf = PdfReader(PDF)
    reader_text = "".join(
        re.sub(rf"^{i}\s+\n", "", page.extract_text()) for i, page in enumerate(pdf.pages, start=1)
    )
    paragraphs = [p for p in doc.paragraphs if p.text.strip() and p._p.find(qn("m:oMath")) is None]
    paragraphs.extend(
        p
        for table in doc.tables
        for row in table.rows
        for cell in row.cells
        for p in cell.paragraphs
        if p.text.strip()
    )
    missing = [p.text for p in paragraphs if normalized(p.text) not in normalized(reader_text)]
    issues = []
    checked_runs = 0
    for p in paragraphs:
        heading = p.style.name.startswith("Heading") or p.style.name == "Title"
        table_header = p._p.getparent().tag == qn("w:tc") and p.runs and p.runs[0].bold
        for r in p.runs:
            if not r.text.strip():
                continue
            checked_runs += 1
            size = r.font.size or p.style.font.size or doc.styles["Normal"].font.size
            font = r.font.name or p.style.font.name or doc.styles["Normal"].font.name
            expected = 12 if heading or table_header else 11
            if font != "Arial" or size.pt != expected:
                issues.append({"text": r.text, "font": font, "pt": size.pt, "expected": expected})
    with ZipFile(DOCX) as archive:
        xml = archive.read("word/document.xml").decode("utf-8")
    manifest = json.loads((ROOT / "data/source/taal-study/manifest.json").read_text())
    source_hashes = []
    for record in manifest["files"]:
        source = ROOT / "data/source/taal-study" / record["file"]
        source_hashes.append(
            {
                "file": record["file"],
                "sha256": digest(source),
                "matches": digest(source) == record["sha256"],
            }
        )
    result = {
        "reviewer": "independent research_accuracy_qa",
        "docx_sha256": digest(DOCX),
        "pdf_sha256": digest(PDF),
        "source_md_sha256": digest(ROOT / "docs/ABO_RESEARCH_IMRAD.md"),
        "pages": len(pdf.pages),
        "checked_prose_cell_paragraphs": len(paragraphs),
        "missing_from_actual_word_pdf": missing,
        "checked_runs": checked_runs,
        "typography_issues": issues,
        "native_equations": xml.count("<m:oMath>"),
        "tables": len(doc.tables),
        "figures": len(doc.inline_shapes),
        "source_archive_hashes": source_hashes,
        "native_word_accessibility_or_speech": "not performed",
        "visual_review": "separate hash-bound page inspection record required",
    }
    OUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    assert not missing and not issues and all(r["matches"] for r in source_hashes)


if __name__ == "__main__":
    main()
