"""Read-only audit of final DOCX and the exact Microsoft Word COM PDF."""

import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile

from lxml import etree
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
}


def value(element, key):
    return element.get(f"{{{NS['w']}}}{key}") if element is not None else None


def normalized(text):
    return "".join(text.split())


def main():
    docx = ROOT / "docs/ABO_RESEARCH_IMRAD.docx"
    pdf = ROOT / "qa/research/word/ABO_RESEARCH_IMRAD.pdf"
    audit = json.loads(
        (ROOT / "qa/research/word/word-render-audit.json").read_text(encoding="utf-8-sig")
    )
    source_hash = hashlib.sha256(docx.read_bytes()).hexdigest()
    pdf_hash = hashlib.sha256(pdf.read_bytes()).hexdigest()
    assert source_hash == audit["source_sha256"], "Word evidence is not the current DOCX"
    assert pdf_hash == audit["pdf_sha256"], "PDF changed after Word evidence"
    assert audit["renderer"] == "Microsoft Word COM, read-only source"
    assert not audit["source_modified"]
    with ZipFile(docx) as archive:
        document = etree.fromstring(archive.read("word/document.xml"))
        xml_parts = [archive.read(name) for name in archive.namelist() if name.endswith(".xml")]
    reader = PdfReader(pdf)
    pages = [page.extract_text() for page in reader.pages]
    # Page numbers are retained in raw evidence; only standalone footer numbers
    # are removed in memory for prose continuity checks across page boundaries.
    joined = normalized("".join(re.sub(r"(?m)^\s*\d{1,2}\s*$", "", page) for page in pages))
    issues, misses, headings = [], [], []
    runs = paragraphs = 0
    for paragraph in document.xpath("//w:body//w:p", namespaces=NS):
        style = value(paragraph.find("w:pPr/w:pStyle", NS), "val")
        text = "".join(paragraph.xpath(".//w:t/text()", namespaces=NS))
        expected = 24 if style in {"Title", "Heading1", "Heading2", "Heading3"} else 22
        row = paragraph.getparent().getparent()
        if etree.QName(row).localname == "tr" and row.find("w:trPr/w:tblHeader", NS) is not None:
            expected = 24
        if style == "Heading1":
            headings.append(text)
        if text.strip() and not paragraph.xpath("./m:oMath", namespaces=NS):
            paragraphs += 1
            if normalized(text) not in joined:
                misses.append(text)
        for run in paragraph.xpath(".//w:r|.//m:r", namespaces=NS):
            runs += 1
            size = value(run.find("w:rPr/w:sz", NS), "val")
            fonts = run.find("w:rPr/w:rFonts", NS)
            families = {value(fonts, key) for key in ("ascii", "hAnsi", "eastAsia", "cs")}
            if size != str(expected) or families != {"Arial"}:
                issues.append(
                    {
                        "paragraph": text[:100],
                        "size_half_points": size,
                        "fonts": sorted(str(x) for x in families),
                        "expected": expected,
                    }
                )
    math = [
        "".join(node.xpath(".//m:t/text()", namespaces=NS))
        for node in document.xpath("//m:oMath", namespaces=NS)
    ]
    figures = [
        {"name": node.get("name"), "description": node.get("descr")}
        for node in document.xpath("//wp:docPr", namespaces=NS)
    ]
    fonts = sorted(
        {
            str(font.get_object().get("/BaseFont"))
            for page in reader.pages
            for font in page["/Resources"].get_object().get("/Font", {}).values()
        }
    )
    result = {
        "source_docx_sha256": source_hash,
        "word_pdf_sha256": pdf_hash,
        "renderer": {
            key: audit[key] for key in ("renderer", "version", "build", "source_modified")
        },
        "page_count": len(pages),
        "main_headings": headings,
        "runs_checked": runs,
        "typography_issues": issues,
        "prose_and_cell_paragraphs_checked": paragraphs,
        "pdf_text_extraction_misses_requiring_visual_review": misses,
        "editable_omml_equations": math,
        "editable_omml_count": len(math),
        "figures": figures,
        "figures_missing_alternative_text": [
            figure for figure in figures if not figure["description"]
        ],
        "pdf_fonts": fonts,
        "pdf_tag_structure_present": "/StructTreeRoot" in reader.trailer["/Root"],
        "tracked_changes": len(document.xpath("//w:ins|//w:del", namespaces=NS)),
        "comment_anchors": len(document.xpath("//w:commentRangeStart", namespaces=NS)),
        "evaluation_watermark_in_source": any(
            re.search(rb"Aspose|Evaluation Only|evaluation copy", part, re.I) for part in xml_parts
        ),
        "page_text": pages,
        "limits": (
            "Structural and typography checks plus separate page review; no native Word "
            "accessibility checker or actual screen-reader speech task performed. Tagged PDF "
            "alone is not an accessibility pass."
        ),
    }
    (ROOT / "qa/gap_closure/independent-manuscript.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {key: val for key, val in result.items() if key != "page_text"},
            indent=2,
            ensure_ascii=True,
        )
    )


if __name__ == "__main__":
    main()
