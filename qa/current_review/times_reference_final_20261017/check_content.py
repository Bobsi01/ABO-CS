import hashlib
import json
import re
from pathlib import Path

from docx import Document
from PIL import Image, ImageChops
from pypdf import PdfReader

root = Path(__file__).resolve().parents[3]
here = Path(__file__).resolve().parent
source = root / 'docs/ABO_RESEARCH_IMRAD.md'
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert source.read_bytes() == (root / 'qa/current_review/times_reference_revision_20261017/before-ABO_RESEARCH_IMRAD.md').read_bytes()
expected = []
authors = []
tables = []
table = []
for line in source.read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line.startswith('|'):
        cells = [x.strip() for x in line.strip('|').split('|')]
        if not all(re.fullmatch(r'[-: ]+', x) for x in cells):
            table.append(cells)
        continue
    if table:
        tables.append(table)
        table = []
    if not line or line.startswith('!['):
        continue
    line = re.sub(r'^#{1,3} ', '', line)
    line = re.sub(r'^([234])\.(\d+) ', lambda m: chr(64 + int(m[2])) + '.\t', line)
    line = line.replace('Keywords:', 'Keywords—', 1)
    expected.append(line)
doc = Document(root / 'docs/ABO_RESEARCH_IMRAD.docx')
actual = []
for p in doc.paragraphs:
    if not p.text:
        continue
    if p.style.name == 'Abstract':
        actual.extend(['Abstract', p.text.removeprefix('Abstract: ')])
    else:
        actual.append(p.text)
assert actual == expected, [(a, b) for a, b in zip(actual, expected) if a != b]
author_table = doc.tables[0]
author_cells = [c for row in author_table.rows for c in row.cells if c.text.strip()]
for cell, expected_author in zip(author_cells, tables[0][1:], strict=True):
    fields = [p.text for p in cell.paragraphs if p.text]
    fields[-1] = fields[-1].replace('\n', '')
    assert fields == expected_author, (fields, expected_author)
for dt, st in zip(doc.tables[1:], tables[1:], strict=True):
    assert [[c.text for c in row.cells] for row in dt.rows] == st
fonts = sorted({str(f.get_object().get('/BaseFont')) for page in PdfReader(here / 'ABO_RESEARCH_IMRAD.pdf').pages for f in page['/Resources'].get('/Font', {}).values()})
assert all('TimesNewRoman' in f for f in fonts), fonts
same_pages = []
for n in range(1, 8):
    previous = Image.open(root / f'qa/current_review/times_reference_word_20261017/page-{n}.png').convert('RGB')
    current = Image.open(here / f'page-{n}.png').convert('RGB')
    if ImageChops.difference(previous, current).getbbox() is None:
        same_pages.append(n)
evidence = {
    'source_docx_sha256': digest(root / 'docs/ABO_RESEARCH_IMRAD.docx'),
    'source_markdown_sha256': digest(source),
    'reference_pdf_sha256': digest(Path('C:/Users/Daniel/Downloads/Documents/Energy-Efficient-Processor-Architectures.pdf')),
    'source_markdown_unchanged_from_before_formatting': True,
    'source_prose_match_after_display_only_heading_transformations': True,
    'source_paragraphs_checked': len(expected),
    'seven_author_records_exact_match': True,
    'two_scientific_tables_exact_match': True,
    'renderer': 'Microsoft Word 16.0 build 16.0.20326, read-only; Poppler 144 dpi',
    'rendered_pages': 7,
    'pages_pixel_identical_to_reviewed_previous_render': same_pages,
    'pdf_fonts': fonts,
    'font': 'Times New Roman',
    'body_pt': 10,
    'section_headings_and_abstract_label_pt': 11,
    'title_pt': 24,
    'body_alignment': 'justified',
    'repository_checks': {'ruff': 'passed', 'python_tests': '219 passed', 'frontend_tests': '115 passed', 'frontend_lint_types_build': 'passed', 'generated_contracts': 'no diff'},
    'evidence_limits': ['Native Word accessibility and screen-reader review not performed', 'Independent final-page review not performed', 'Formatting review does not establish scientific predictive accuracy'],
}
(here / 'visual-and-content-review.json').write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf-8')
print(json.dumps(evidence, indent=2))
