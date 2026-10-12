"""Read-only manuscript formatting, source hashes and fresh Word page audit.

Run with the Codex bundled artifact Python. Output is new attributed QA evidence.
"""

import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

import pypdfium2 as pdfium
from docx import Document
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / "word"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    manuscript = ROOT / "docs/ABO_RESEARCH_IMRAD.docx"
    doc = Document(manuscript)
    typography = []
    checked = 0
    paragraphs = list(doc.paragraphs)
    paragraphs += [
        p for t in doc.tables for row in t.rows for cell in row.cells for p in cell.paragraphs
    ]
    for paragraph in paragraphs:
        heading = paragraph.style.name.startswith("Heading") or paragraph.style.name == "Title"
        table_header = (
            paragraph._p.getparent().tag.endswith("}tc")
            and bool(paragraph.runs)
            and paragraph.runs[0].bold
        )
        for run in paragraph.runs:
            if not run.text.strip():
                continue
            checked += 1
            font = run.font.name or paragraph.style.font.name or doc.styles["Normal"].font.name
            size = run.font.size or paragraph.style.font.size or doc.styles["Normal"].font.size
            expected = 12 if heading or table_header else 11
            if font != "Arial" or size.pt != expected:
                typography.append({"text": run.text, "font": font, "size_pt": size.pt})
    with ZipFile(manuscript) as archive:
        xml = archive.read("word/document.xml").decode("utf-8")
    manifest = json.loads(
        (ROOT / "data/source/taal-study/manifest.json").read_text(encoding="utf-8")
    )
    sources = [
        {
            "file": record["file"],
            "matches": digest(ROOT / "data/source/taal-study" / record["file"]) == record["sha256"],
        }
        for record in manifest["files"]
    ]
    pdf = pdfium.PdfDocument(OUT / "ABO_RESEARCH_IMRAD.pdf")
    pages = []
    rendered = []
    for index in range(len(pdf)):
        page = pdf[index]
        image = page.render(scale=125 / 60).to_pil().convert("RGB")
        target = OUT / f"page-{index + 1}.png"
        image.save(target)
        previous = Image.open(ROOT / f"qa/current_review/word/page-{index + 1}.png").convert("RGB")
        equal = image.size == previous.size and image.tobytes() == previous.tobytes()
        pages.append(
            {
                "page": index + 1,
                "file": target.relative_to(ROOT).as_posix(),
                "sha256": digest(target),
                "size_px": image.size,
                "pixel_identical_to_previous_word_page": equal,
            }
        )
        rendered.append(image)
        page.close()
    for start in range(0, len(rendered), 2):
        pair = rendered[start : start + 2]
        sheet = Image.new("RGB", (sum(p.width for p in pair), max(p.height for p in pair)), "white")
        offset = 0
        for image in pair:
            sheet.paste(image, (offset, 0))
            offset += image.width
        sheet.save(OUT / f"review-{start + 1:02d}-{min(start + 2, len(rendered)):02d}.png")
    pdf.close()
    result = {
        "reviewer": "root integration QA, fresh read-only Microsoft Word render",
        "docx_sha256": digest(manuscript),
        "source_md_sha256": digest(ROOT / "docs/ABO_RESEARCH_IMRAD.md"),
        "pdf_sha256": digest(OUT / "ABO_RESEARCH_IMRAD.pdf"),
        "checked_runs": checked,
        "typography_issues": typography,
        "tables": len(doc.tables),
        "figures": len(doc.inline_shapes),
        "native_equations": xml.count("<m:oMath>"),
        "source_archive_hashes": sources,
        "pages": pages,
        "visual_review": "pending root review of all eight page-pair images",
        "limits": "No native Word accessibility checker or screen-reader speech test",
    }
    (OUT / "format-page-audit.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "pages": len(pages),
                "checked_runs": checked,
                "typography_issues": typography,
                "source_hashes_match": all(s["matches"] for s in sources),
                "identical_to_prior_pages": sum(
                    p["pixel_identical_to_previous_word_page"] for p in pages
                ),
            }
        )
    )
    assert not typography and all(s["matches"] for s in sources)


if __name__ == "__main__":
    main()
