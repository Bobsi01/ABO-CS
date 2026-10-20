"""Build the local IMRaD manuscript with the requested typography."""

from __future__ import annotations

import json
import re
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "ABO_RESEARCH_IMRAD.md"
OUTPUT = ROOT / "docs" / "ABO_RESEARCH_IMRAD.docx"
AUDIT = ROOT / "qa" / "research" / "format-audit.json"
HEADER_ART = ROOT / "docs" / "figures" / "university-header.png"
BODY_PT = 10
HEADING_PT = 11
TITLE_PT = 24
FONT_FAMILY = "Times New Roman"


def font(target, size=BODY_PT, bold=None):
    target.font.name = FONT_FAMILY
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
        fonts.set(qn(f"w:{attribute}"), FONT_FAMILY)
    for attribute in ("asciiTheme", "hAnsiTheme", "eastAsiaTheme", "cstheme"):
        fonts.attrib.pop(qn(f"w:{attribute}"), None)


def scientific_text(paragraph, text):
    """Use true subscripts in prose without changing the body run size."""
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
        fonts.set(qn(f"w:{attribute}"), FONT_FAMILY)
    props.append(fonts)
    for tag, value in (("sz", "20"), ("szCs", "20"), ("color", "000000")):
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
            math_run(" = "),
            sub("ΔΦ", "E"),
            math_run(" "),
            sub("ΔΦ", "N"),
            math_run("."),
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
    widths = (1.42, 0.58, 1.05) if "Input" in rows[0] else (1.07, 0.90, 1.08)
    if "Quantity" in rows[0]:
        widths = (0.93, 1.08, 1.08)
    if "Diameter (µm)" in rows[0]:
        widths = (0.94, 0.94, 1.17)
    if "Geographic reference" in rows[0]:
        widths = (0.75, 1.20, 1.10)
    if "Included / total" in rows[0]:
        widths = (0.75, 1.20, 1.10)
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
            paragraph.paragraph_format.first_line_indent = Inches(0)
            # The manuscript's short tables should move as a whole. Retain
            # ordinary repeated-header pagination for any future long table.
            paragraph.paragraph_format.keep_with_next = (
                index < len(rows) - 1 if len(rows) <= 12 else index == 0
            )
            paragraph.alignment = (
                WD_ALIGN_PARAGRAPH.CENTER if column == 1 else WD_ALIGN_PARAGRAPH.LEFT
            )
            font(paragraph.add_run(value), 10 if index == 0 else 9, index == 0)
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


def author_grid(document, rows):
    """Keep each author's editable name, affiliation and email in one block."""
    authors = rows[1:]
    result = document.add_table(rows=(len(authors) + 2) // 3, cols=3)
    result.autofit = False
    caption = OxmlElement("w:tblCaption")
    caption.set(qn("w:val"), "Author affiliations")
    result._tbl.tblPr.append(caption)
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        item = OxmlElement(f"w:{edge}")
        item.set(qn("w:val"), "nil")
        borders.append(item)
    result._tbl.tblPr.append(borders)
    for column in result.columns:
        column.width = Inches(6.5 / 3)
    for row_index, row in enumerate(result.rows):
        row._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))
        for cell in row.cells:
            cell.width = Inches(6.5 / 3)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
            margins = OxmlElement("w:tcMar")
            for edge in ("left", "right"):
                margin = OxmlElement(f"w:{edge}")
                margin.set(qn("w:w"), "0")
                margin.set(qn("w:type"), "dxa")
                margins.append(margin)
            cell._tc.get_or_add_tcPr().append(margins)
            cell.paragraphs[0].paragraph_format.space_after = Pt(0)
        group = authors[row_index * 3 : row_index * 3 + 3]
        for column_index, author in enumerate(group):
            if len(group) == 1:
                column_index = 1
            cell = row.cells[column_index]
            for field_index, value in enumerate(author):
                paragraph = cell.paragraphs[0] if field_index == 0 else cell.add_paragraph()
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                paragraph.paragraph_format.line_spacing = 1.0
                paragraph.paragraph_format.first_line_indent = Inches(0)
                paragraph.paragraph_format.space_after = Pt(0 if field_index < 4 else 8)
                paragraph.paragraph_format.keep_together = True
                paragraph.paragraph_format.keep_with_next = field_index < 4
                text = value.replace("@", "\n@", 1) if field_index == 4 else value
                run = paragraph.add_run(text)
                font(run, BODY_PT, False)
                run.italic = field_index in (1, 2, 3)
    return result


def is_author_grid(item):
    caption = item._tbl.tblPr.find(qn("w:tblCaption"))
    return caption is not None and caption.get(qn("w:val")) == "Author affiliations"


def audit(document):
    issues = []
    checked = 0
    paragraphs = [
        (
            p,
            TITLE_PT
            if p.style.name == "Title"
            else HEADING_PT
            if p.style.name in {"Heading 1", "Heading 2"}
            else BODY_PT,
        )
        for p in document.paragraphs
    ]
    for item in document.tables:
        paragraphs.extend(
            (p, BODY_PT if is_author_grid(item) else 10 if index == 0 else 9)
            for index, row in enumerate(item.rows)
            for cell in row.cells
            for p in cell.paragraphs
        )
    for section in document.sections:
        paragraphs.extend((p, 9) for p in section.first_page_footer.paragraphs)
        paragraphs.extend((p, 9) for p in section.footer.paragraphs)
    for paragraph, expected in paragraphs:
        if paragraph.style.name == "Caption":
            expected = 9
        for run in paragraph.runs:
            if not run.text and not run._r.findall(qn("w:fldChar")):
                continue
            checked += 1
            run_expected = (
                HEADING_PT
                if paragraph.style.name == "Abstract" and run.text == "Abstract: "
                else expected
            )
            if run.font.name != FONT_FAMILY or run.font.size.pt != run_expected:
                issues.append(f"Invalid typography: {run.text[:60]}")
            if paragraph.style.name in {"Heading 1", "Heading 2"} and run.bold is not True:
                issues.append(f"Heading must be bold: {run.text}")
    headings = [p.text for p in document.paragraphs if p.style.name == "Heading 1"]
    if any(
        p.style.name == "Abstract" and p.text.startswith("Abstract: ") for p in document.paragraphs
    ):
        headings.insert(0, "Abstract")
    expected_headings = [
        "Abstract",
        "I. Introduction",
        "II. Methods",
        "III. Results",
        "IV. Discussion",
        "References",
    ]
    if headings != expected_headings:
        issues.append(f"Unexpected manuscript structure: {headings}")
    math = document.element.findall(".//" + qn("m:oMath"))
    expected_equations = sum(
        bool(re.search(r"\s\(([1-7])\)$", line))
        for line in SOURCE.read_text(encoding="utf-8").splitlines()
    )
    if len(math) != expected_equations:
        issues.append(f"Expected {expected_equations} native equations, found {len(math)}")
    body_paragraphs = [
        p
        for p in document.paragraphs
        if p.text.strip()
        and p.style.name in {"Normal", "Abstract", "Keywords"}
        and not p.text.startswith("BSCS 4B")
        and not re.fullmatch(r"\d{1,2} \w+ \d{4}", p.text)
        and p._p.find(qn("m:oMath")) is None
    ]
    for p in body_paragraphs:
        alignment = p.alignment if p.alignment is not None else p.style.paragraph_format.alignment
        if alignment != WD_ALIGN_PARAGRAPH.JUSTIFY:
            issues.append(f"Body paragraph is not justified: {p.text[:60]}")
    for node in math:
        for run in node.findall(".//" + qn("m:r")):
            props = run.find(qn("w:rPr"))
            if props is None or (
                props.find(qn("w:rFonts")).get(qn("w:ascii")) != FONT_FAMILY
                or props.find(qn("w:sz")).get(qn("w:val")) != "20"
            ):
                issues.append("Invalid equation typography")
            checked += 1
    author_count = sum(
        bool(cell.text.strip())
        for item in document.tables
        if is_author_grid(item)
        for row in item.rows
        for cell in row.cells
    )
    if author_count != 7:
        issues.append(f"Expected seven authors, found {author_count}")
    if issues:
        raise ValueError("\n".join(issues))
    return {
        "file": str(OUTPUT.relative_to(ROOT)),
        "font": FONT_FAMILY,
        "title_pt": TITLE_PT,
        "body_pt": BODY_PT,
        "headings_pt": HEADING_PT,
        "body_alignment": "justified",
        "justified_body_paragraphs": len(body_paragraphs),
        "table_headers_pt": 10,
        "checked_text_runs": checked,
        "major_sections": headings,
        "tables": sum(not is_author_grid(item) for item in document.tables),
        "authors": author_count,
        "native_equations": len(math),
        "page_size": "Letter, portrait",
        "issues": issues,
    }


def main():
    document = Document()
    section = document.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(2)
    section.bottom_margin = Inches(1)
    section.left_margin = section.right_margin = Inches(1)
    section.footer_distance = Inches(0.45)
    section.different_first_page_header_footer = True
    header_run = section.first_page_header.paragraphs[0].add_run()
    header_image = header_run.add_picture(str(HEADER_ART), width=Inches(3.37))
    header_image._inline.docPr.set(
        "descr",
        "University of Caloocan City Congress Campus, Computer Studies Department",
    )
    for style in document.styles:
        if hasattr(style, "font"):
            size = (
                TITLE_PT
                if style.name == "Title"
                else HEADING_PT
                if style.name.startswith("Heading")
                else BODY_PT
            )
            font(style, size)
    title_props = document.styles["Title"].element.get_or_add_pPr()
    title_border = title_props.find(qn("w:pBdr"))
    if title_border is not None:
        title_props.remove(title_border)
    normal = document.styles["Normal"].paragraph_format
    normal.line_spacing = 1.0
    normal.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    normal.first_line_indent = Inches(0.14)
    normal.space_after = Pt(4)
    normal.widow_control = True
    for name in ("Heading 1", "Heading 2"):
        style = document.styles[name]
        font(style, HEADING_PT, True)
        style.paragraph_format.alignment = (
            WD_ALIGN_PARAGRAPH.CENTER if name == "Heading 1" else WD_ALIGN_PARAGRAPH.LEFT
        )
        style.paragraph_format.first_line_indent = Inches(0)
        style.paragraph_format.space_before = Pt(10)
        style.paragraph_format.space_after = Pt(4)
        style.paragraph_format.keep_with_next = True
        style.paragraph_format.keep_together = True
    document.styles["Heading 1"].font.small_caps = True
    document.styles["Caption"].paragraph_format.first_line_indent = Inches(0)
    for name in ("Abstract", "Keywords"):
        style = document.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
        style.base_style = document.styles["Normal"]
        font(style, BODY_PT, True)
        style.font.italic = True
        style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    document.styles["Keywords"].paragraph_format.space_before = Pt(5)
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    document_title = next(line[2:] for line in lines if line.startswith("# "))
    for footer in (section.first_page_footer, section.footer):
        paragraph = footer.paragraphs[0]
        paragraph.paragraph_format.first_line_indent = Inches(0)
        paragraph.paragraph_format.tab_stops.add_tab_stop(Inches(6.5), WD_TAB_ALIGNMENT.RIGHT)
        title_run = paragraph.add_run(document_title)
        font(title_run, 9)
        title_run.italic = True
        font(paragraph.add_run("\tPage "), 9)
        for tag, text in (("fldChar", "begin"), ("instrText", "PAGE"), ("fldChar", "end")):
            run = paragraph.add_run()
            font(run, 9)
            field = OxmlElement(f"w:{tag}")
            if tag == "fldChar":
                field.set(qn("w:fldCharType"), text)
            else:
                field.set(qn("xml:space"), "preserve")
                field.text = text
            run._r.append(field)
    index = 0
    references = False
    author_names = []
    abstract_next = False
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
            if rows[0] == ["Author", "Department", "University", "Location", "Email"]:
                author_grid(document, rows)
                author_names = [row[0] for row in rows[1:]]
            else:
                table(document, rows)
            continue
        if line.startswith("# "):
            paragraph = document.add_paragraph(style="Title")
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            paragraph.paragraph_format.space_after = Pt(9)
            paragraph.paragraph_format.first_line_indent = Inches(0)
            font(paragraph.add_run(line[2:]), TITLE_PT, False)
        elif line.startswith("## "):
            text = line[3:]
            if text == "Abstract":
                section = document.add_section(WD_SECTION.CONTINUOUS)
                section.page_width = Inches(8.5)
                section.page_height = Inches(11)
                section.top_margin = section.bottom_margin = Inches(1)
                section.left_margin = section.right_margin = Inches(1)
                section.footer_distance = Inches(0.45)
                columns = section._sectPr.xpath("./w:cols")[0]
                columns.set(qn("w:num"), "2")
                columns.set(qn("w:space"), "360")
                section.start_type = WD_SECTION.CONTINUOUS
                abstract_next = True
                continue
            references = text == "References"
            paragraph = document.add_paragraph(style="Heading 1")
            font(paragraph.add_run(text), HEADING_PT, True)
        elif line.startswith("### "):
            paragraph = document.add_paragraph(style="Heading 2")
            text = line[4:]
            if match := re.match(r"[2-4]\.([1-9]) (.+)", text):
                text = f"{chr(64 + int(match.group(1)))}.\t{match.group(2)}"
            paragraph.paragraph_format.left_indent = Inches(0.18)
            paragraph.paragraph_format.first_line_indent = Inches(-0.18)
            paragraph.paragraph_format.tab_stops.add_tab_stop(Inches(0.18))
            font(paragraph.add_run(text), HEADING_PT, True)
        elif image_match := re.fullmatch(r"!\[([^]]+)\]\(([^)]+)\)", line):
            image_path = (SOURCE.parent / image_match.group(2)).resolve()
            if not image_path.is_relative_to(SOURCE.parent.resolve()):
                raise ValueError("Manuscript figures must remain within docs/")
            paragraph = document.add_paragraph()
            paragraph.paragraph_format.first_line_indent = Inches(0)
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            paragraph.paragraph_format.keep_with_next = True
            picture_run = paragraph.add_run()
            font(picture_run, BODY_PT)
            picture = picture_run.add_picture(str(image_path), width=Inches(3.02))
            picture._inline.docPr.set("descr", image_match.group(1))
        else:
            paragraph = document.add_paragraph()
            if abstract_next:
                paragraph.style = "Abstract"
                run = paragraph.add_run("Abstract: ")
                font(run, HEADING_PT, True)
                run.italic = True
                run = paragraph.add_run(line)
                font(run, BODY_PT, True)
                run.italic = True
                abstract_next = False
                continue
            if line.startswith("Keywords:"):
                paragraph.style = "Keywords"
                run = paragraph.add_run(line.replace("Keywords:", "Keywords—", 1))
                font(run, BODY_PT, True)
                run.italic = True
                continue
            math_match = re.search(r"\(([1-7])\)$", line)
            if math_match and not references:
                equation(paragraph, int(math_match.group(1)))
                continue
            if references:
                font(paragraph.add_run(line))
            else:
                scientific_text(paragraph, line)
            if re.match(r"Table \d+\.", line):
                paragraph.style = "Caption"
                paragraph.paragraph_format.keep_with_next = True
                paragraph.paragraph_format.space_before = Pt(6)
                caption = paragraph.runs[0].text
                boundary = caption.index(".") + 1
                paragraph.runs[0].text = caption[:boundary]
                font(paragraph.runs[0], 9, True)
                font(paragraph.add_run(caption[boundary:]), 9, False)
            elif re.match(r"Figure \d+\.", line):
                paragraph.style = "Caption"
                paragraph.paragraph_format.keep_together = True
                paragraph.paragraph_format.space_after = Pt(9)
                caption = paragraph.runs[0].text
                boundary = caption.index(".") + 1
                paragraph.runs[0].text = caption[:boundary]
                font(paragraph.runs[0], 9, True)
                font(paragraph.add_run(caption[boundary:]), 9, False)
            elif references:
                paragraph.paragraph_format.left_indent = Inches(0.25)
                paragraph.paragraph_format.first_line_indent = Inches(-0.25)
                paragraph.paragraph_format.keep_together = True
            elif line.startswith("BSCS 4B") or re.fullmatch(r"\d{1,2} \w+ \d{4}", line):
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                paragraph.paragraph_format.first_line_indent = Inches(0)
    # A closing continuous section balances the final bibliography columns.
    closing_section = document.add_section(WD_SECTION.CONTINUOUS)
    closing_section._sectPr.xpath("./w:cols")[0].set(qn("w:num"), "1")
    document.core_properties.title = document_title
    document.core_properties.author = "; ".join(author_names)
    document.core_properties.subject = (
        "CSE 103: IMRaD volcanic processes and secondary data research"
    )
    document.core_properties.keywords = (
        "IMRaD, Taal, Mayon, Kanlaon, volcanic hazards, ashfall, wind, seismicity, deformation"
    )
    document.save(OUTPUT)
    result = audit(Document(OUTPUT))
    AUDIT.parent.mkdir(parents=True, exist_ok=True)
    AUDIT.write_bytes((json.dumps(result, indent=2) + "\n").encode("utf-8"))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
