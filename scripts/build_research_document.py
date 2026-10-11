"""Build the local IMRaD manuscript with the requested typography."""

from __future__ import annotations

import json
import re
from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "ABO_RESEARCH_IMRAD.md"
OUTPUT = ROOT / "docs" / "ABO_RESEARCH_IMRAD.docx"
AUDIT = ROOT / "qa" / "research" / "format-audit.json"


def font(target, size=11, bold=None):
    target.font.name = "Arial"
    target.font.size = Pt(size)
    target.font.color.rgb = RGBColor(0, 0, 0)
    if bold is not None:
        target.font.bold = bold
    props = target.element.get_or_add_rPr()
    fonts = props.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        props.insert(0, fonts)
    for attribute in ("ascii", "hAnsi", "eastAsia", "cs"):
        fonts.set(qn(f"w:{attribute}"), "Arial")
    for attribute in ("asciiTheme", "hAnsiTheme", "eastAsiaTheme", "cstheme"):
        fonts.attrib.pop(qn(f"w:{attribute}"), None)


def scientific_text(paragraph, text):
    """Use true subscripts in prose without changing the 11 pt run size."""
    position = 0
    for match in re.finditer(r"_([A-Za-z0-9]+(?:,[A-Za-z0-9]+)?)", text):
        font(paragraph.add_run(text[position : match.start()]))
        run = paragraph.add_run(match.group(1))
        font(run)
        run.font.subscript = True
        position = match.end()
    font(paragraph.add_run(text[position:]))


def math_run(text):
    result = OxmlElement("m:r")
    math_props = OxmlElement("m:rPr")
    normal = OxmlElement("m:nor")
    normal.set(qn("m:val"), "1")
    math_props.append(normal)
    result.append(math_props)
    props = OxmlElement("w:rPr")
    fonts = OxmlElement("w:rFonts")
    for attribute in ("ascii", "hAnsi", "eastAsia", "cs"):
        fonts.set(qn(f"w:{attribute}"), "Arial")
    props.append(fonts)
    for tag, value in (("sz", "22"), ("szCs", "22"), ("color", "000000")):
        item = OxmlElement(f"w:{tag}")
        item.set(qn("w:val"), value)
        props.append(item)
    result.append(props)
    item = OxmlElement("m:t")
    item.set(qn("xml:space"), "preserve")
    item.text = text
    result.append(item)
    return result


def math_nodes(value):
    if isinstance(value, str):
        return [math_run(value)]
    return value if isinstance(value, list) else [value]


def math_structure(tag, **parts):
    result = OxmlElement(f"m:{tag}")
    for name, content in parts.items():
        part = OxmlElement(f"m:{name}")
        part.extend(math_nodes(content))
        result.append(part)
    return result


def sub(base, index):
    return math_structure("sSub", e=base, sub=index)


def sup(base, power):
    return math_structure("sSup", e=base, sup=power)


def fraction(numerator, denominator):
    return math_structure("f", num=numerator, den=denominator)


def equations():
    """OMML structures retain native fractions, powers and indices in Word."""

    def variance():
        return sup(sub("s", "ij"), "2")

    def cdf(bound, axis):
        return [
            math_run("Φ("),
            fraction([math_run(bound + " − "), sub("μ", axis + ",ij")], sub("s", "ij")),
            math_run(")"),
        ]

    return {
        1: [
            math_run("M = Q T;   "),
            sub("h", "j"),
            math_run(" = "),
            fraction("H(j + 0.5)", "J"),
            math_run(";   j = 0, …, J − 1."),
        ],
        2: [
            sub("u", "E"),
            math_run(" = −U sin(f);   "),
            sub("u", "N"),
            math_run(" = −U cos(f)."),
        ],
        3: [
            sub("τ", "ij"),
            math_run(" = "),
            fraction(sub("h", "j"), sub("v", "i")),
            math_run(";   "),
            sub("μ", "ij"),
            math_run(" = ("),
            sub("u", "E"),
            sub("τ", "ij"),
            math_run(", "),
            sub("u", "N"),
            sub("τ", "ij"),
            math_run(");   "),
            variance(),
            math_run(" = "),
            sup(sub("σ", "0"), "2"),
            math_run(" + 2K"),
            sub("τ", "ij"),
            math_run("."),
        ],
        4: [
            math_run("L(E,N) = "),
            sub("Σ", "i,j"),
            fraction([math_run("M "), sub("w", "i")], [math_run("J 2π "), variance()]),
            math_run(" exp(−"),
            fraction(
                [
                    sup([math_run("(E − "), sub("μ", "E,ij"), math_run(")")], "2"),
                    math_run(" + "),
                    sup([math_run("(N − "), sub("μ", "N,ij"), math_run(")")], "2"),
                ],
                [math_run("2"), variance()],
            ),
            math_run(")."),
        ],
        5: [
            sub("P", "ij"),
            math_run(" = ["),
            *cdf("b", "E"),
            math_run(" − "),
            *cdf("a", "E"),
            math_run("] ["),
            *cdf("d", "N"),
            math_run(" − "),
            *cdf("c", "N"),
            math_run("]."),
        ],
        6: [
            sub("A", "ij"),
            math_run("(t) = "),
            fraction([math_run("M "), sub("w", "i")], "J"),
            math_run(" clip("),
            fraction([math_run("t − "), sub("τ", "ij")], "T"),
            math_run(", 0, 1)."),
        ],
        7: [
            math_run("v = "),
            fraction(
                [sub("ρ", "l"), math_run(" g "), sup("h", "2"), math_run(" sin(α)")],
                "3η",
            ),
            math_run(";   h = "),
            sup(
                [
                    math_run("["),
                    fraction("3ηq", [sub("ρ", "l"), math_run(" g w sin(α)")]),
                    math_run("]"),
                ],
                "1/3",
            ),
            math_run(";   v = "),
            fraction("q", "wh"),
            math_run("."),
        ],
    }


def equation(paragraph, number):
    node = OxmlElement("m:oMath")
    node.extend(equations()[number])
    paragraph._p.append(node)
    font(paragraph.add_run(f"   ({number})"))
    paragraph.paragraph_format.keep_together = True
    paragraph.paragraph_format.space_before = Pt(4)
    paragraph.paragraph_format.space_after = Pt(8)


def table(document, rows):
    result = document.add_table(rows=0, cols=len(rows[0]))
    result.autofit = False
    widths = (2.45, 1.25, 2.57) if "Input" in rows[0] else (2.05, 1.62, 2.60)
    if "Diameter (µm)" in rows[0]:
        widths = (2.09, 2.09, 2.09)
    props = result._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        item = OxmlElement(f"w:{edge}")
        for key, value in {"val": "single", "sz": "4", "color": "D9D9D9"}.items():
            item.set(qn(f"w:{key}"), value)
        borders.append(item)
    props.append(borders)
    margins = OxmlElement("w:tblCellMar")
    for edge in ("top", "bottom", "left", "right"):
        item = OxmlElement(f"w:{edge}")
        item.set(qn("w:w"), "80")
        item.set(qn("w:type"), "dxa")
        margins.append(item)
    props.append(margins)
    for index, values in enumerate(rows):
        row = result.add_row()
        row_props = row._tr.get_or_add_trPr()
        row_props.append(OxmlElement("w:cantSplit"))
        if index == 0:
            row_props.append(OxmlElement("w:tblHeader"))
        for column, value in enumerate(values):
            cell = row.cells[column]
            cell.width = Inches(widths[column])
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            paragraph = cell.paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(0)
            paragraph.paragraph_format.line_spacing = 1.05
            # The manuscript's short tables should move as a whole. Retain
            # ordinary repeated-header pagination for any future long table.
            paragraph.paragraph_format.keep_with_next = (
                index < len(rows) - 1 if len(rows) <= 12 else index == 0
            )
            paragraph.alignment = (
                WD_ALIGN_PARAGRAPH.CENTER if column == 1 else WD_ALIGN_PARAGRAPH.LEFT
            )
            font(paragraph.add_run(value), 12 if index == 0 else 11, index == 0)
            if index == 0:
                shading = OxmlElement("w:shd")
                shading.set(qn("w:fill"), "EAEAEA")
                cell._tc.get_or_add_tcPr().append(shading)
    for column, width in zip(result.columns, widths, strict=True):
        column.width = Inches(width)
    spacer = document.add_paragraph()
    spacer.paragraph_format.space_after = Pt(0)
    spacer.paragraph_format.line_spacing = 1
    spacer.paragraph_format.space_before = Pt(0)
    font(spacer.add_run(""))
    spacer.paragraph_format.line_spacing = Pt(5)
    return result


def audit(document):
    issues = []
    checked = 0
    paragraphs = [
        (p, 12 if p.style.name in {"Title", "Heading 1", "Heading 2"} else 11)
        for p in document.paragraphs
    ]
    for item in document.tables:
        paragraphs.extend(
            (p, 12 if index == 0 else 11)
            for index, row in enumerate(item.rows)
            for cell in row.cells
            for p in cell.paragraphs
        )
    for section in document.sections:
        paragraphs.extend((p, 11) for p in section.footer.paragraphs)
    for paragraph, expected in paragraphs:
        for run in paragraph.runs:
            if not run.text and not run._r.findall(qn("w:fldChar")):
                continue
            checked += 1
            if run.font.name != "Arial" or run.font.size.pt != expected:
                issues.append(f"Invalid typography: {run.text[:60]}")
    headings = [p.text for p in document.paragraphs if p.style.name == "Heading 1"]
    expected_headings = [
        "Abstract",
        "1. Introduction",
        "2. Methods",
        "3. Results",
        "4. Discussion",
        "References",
    ]
    if headings != expected_headings:
        issues.append(f"Unexpected manuscript structure: {headings}")
    math = document.element.findall(".//" + qn("m:oMath"))
    if len(math) != 7:
        issues.append(f"Expected seven native equations, found {len(math)}")
    for node in math:
        for run in node.findall(".//" + qn("m:r")):
            props = run.find(qn("w:rPr"))
            if props is None or (
                props.find(qn("w:rFonts")).get(qn("w:ascii")) != "Arial"
                or props.find(qn("w:sz")).get(qn("w:val")) != "22"
            ):
                issues.append("Invalid equation typography")
            checked += 1
    if issues:
        raise ValueError("\n".join(issues))
    return {
        "file": str(OUTPUT.relative_to(ROOT)),
        "font": "Arial",
        "body_pt": 11,
        "headings_pt": 12,
        "table_headers_pt": 12,
        "checked_text_runs": checked,
        "major_sections": headings,
        "tables": len(document.tables),
        "native_equations": len(math),
        "page_size": "Letter, portrait",
        "issues": issues,
    }


def main():
    document = Document()
    section = document.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = section.bottom_margin = Inches(1)
    section.left_margin = section.right_margin = Inches(1)
    section.footer_distance = Inches(0.45)
    for style in document.styles:
        if hasattr(style, "font"):
            size = 12 if style.name == "Title" or style.name.startswith("Heading") else 11
            font(style, size)
    title_props = document.styles["Title"].element.get_or_add_pPr()
    title_border = title_props.find(qn("w:pBdr"))
    if title_border is not None:
        title_props.remove(title_border)
    normal = document.styles["Normal"].paragraph_format
    normal.line_spacing = 1.15
    normal.space_after = Pt(6)
    normal.widow_control = True
    for name in ("Heading 1", "Heading 2"):
        style = document.styles[name]
        font(style, 12, True)
        style.paragraph_format.space_before = Pt(12)
        style.paragraph_format.space_after = Pt(5)
        style.paragraph_format.keep_with_next = True
        style.paragraph_format.keep_together = True
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for tag, text in (("fldChar", "begin"), ("instrText", "PAGE"), ("fldChar", "end")):
        run = footer.add_run()
        font(run)
        field = OxmlElement(f"w:{tag}")
        if tag == "fldChar":
            field.set(qn("w:fldCharType"), text)
        else:
            field.set(qn("xml:space"), "preserve")
            field.text = f" {text} "
        run._r.append(field)
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    index = 0
    references = False
    while index < len(lines):
        line = lines[index].strip()
        index += 1
        if not line:
            continue
        if line.startswith("|"):
            rows = []
            while True:
                values = [value.strip() for value in line.strip("|").split("|")]
                if not all(re.fullmatch(r"[-: ]+", value) for value in values):
                    rows.append(values)
                if index >= len(lines) or not lines[index].strip().startswith("|"):
                    break
                line = lines[index].strip()
                index += 1
            table(document, rows)
            continue
        if line.startswith("# "):
            paragraph = document.add_paragraph(style="Title")
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            paragraph.paragraph_format.space_after = Pt(9)
            font(paragraph.add_run(line[2:]), 12, True)
        elif line.startswith("## "):
            text = line[3:]
            references = text == "References"
            paragraph = document.add_paragraph(style="Heading 1")
            font(paragraph.add_run(text), 12, True)
        elif line.startswith("### "):
            paragraph = document.add_paragraph(style="Heading 2")
            font(paragraph.add_run(line[4:]), 12, True)
        elif image_match := re.fullmatch(r"!\[([^]]+)\]\(([^)]+)\)", line):
            image_path = (SOURCE.parent / image_match.group(2)).resolve()
            if not image_path.is_relative_to(SOURCE.parent.resolve()):
                raise ValueError("Manuscript figures must remain within docs/")
            paragraph = document.add_paragraph()
            paragraph.paragraph_format.keep_with_next = True
            picture_run = paragraph.add_run()
            font(picture_run, 11)
            picture = picture_run.add_picture(str(image_path), width=Inches(6.27))
            picture._inline.docPr.set("descr", image_match.group(1))
        else:
            paragraph = document.add_paragraph()
            math_match = re.search(r"\(([1-7])\)$", line)
            if math_match and not references:
                equation(paragraph, int(math_match.group(1)))
                continue
            if references:
                font(paragraph.add_run(line))
            else:
                scientific_text(paragraph, line)
            if re.match(r"Table \d+\.", line):
                paragraph.paragraph_format.keep_with_next = True
                paragraph.paragraph_format.space_before = Pt(6)
                paragraph.runs[0].bold = True
            elif re.match(r"Figure \d+\.", line):
                paragraph.paragraph_format.keep_together = True
                paragraph.paragraph_format.space_after = Pt(9)
                paragraph.runs[0].bold = True
            elif references:
                paragraph.paragraph_format.left_indent = Inches(0.25)
                paragraph.paragraph_format.first_line_indent = Inches(-0.25)
            elif line.startswith("BSCS 4B") or re.fullmatch(r"\d{1,2} \w+ \d{4}", line):
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    document.core_properties.title = document.paragraphs[0].text
    document.core_properties.author = "BSCS 4B"
    document.core_properties.subject = "CSE 103: IMRaD computational model study"
    document.core_properties.keywords = (
        "ABO, IMRaD, ashfall, Gaussian fallout, educational simulation"
    )
    document.save(OUTPUT)
    result = audit(Document(OUTPUT))
    AUDIT.parent.mkdir(parents=True, exist_ok=True)
    AUDIT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
