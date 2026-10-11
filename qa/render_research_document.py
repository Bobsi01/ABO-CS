"""Render the actual DOCX for internal QA when bundled LibreOffice is absent.

Aspose evaluation markings are left intact in QA images/PDF. This renderer never
saves or changes the deliverable DOCX and does not claim Word-layout equivalence.
"""

from __future__ import annotations

import json
from pathlib import Path

import aspose.words as aw

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "qa" / "research" / "rendered"
SOURCE = ROOT / "docs" / "ABO_RESEARCH_IMRAD.docx"


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    document = aw.Document(str(SOURCE))
    source_text = document.get_text()
    document.update_page_layout()
    pages = document.page_count
    document.save(str(OUTPUT / "ABO_RESEARCH_IMRAD.pdf"), aw.SaveFormat.PDF)
    for index in range(pages):
        options = aw.saving.ImageSaveOptions(aw.SaveFormat.PNG)
        options.page_set = aw.saving.PageSet(index)
        options.horizontal_resolution = 150
        options.vertical_resolution = 150
        document.save(str(OUTPUT / f"page-{index + 1}.png"), options)
    evidence = {
        "renderer": f"Aspose.Words {aw.BuildVersionInfo.version} evaluation",
        "evaluation_markings": "Retained in internal renders; absent from the source DOCX",
        "source_docx_modified": False,
        "pages": pages,
        "last_reference_present": "Frequently asked questions and answers about lava-flow hazards"
        in source_text,
        "last_reference_on_final_page": "Frequently asked questions"
        in document.extract_pages(pages - 1, 1).get_text(),
        "visual_review": "pending",
    }
    (OUTPUT / "render-audit.json").write_text(
        json.dumps(evidence, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(evidence, indent=2))


if __name__ == "__main__":
    main()
