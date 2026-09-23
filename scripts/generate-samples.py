"""Build the fictional source pack from canonical TXT, preserving all source wording.

Run with Python + reportlab + pypdf and Poppler. Optionally set
REMAINDER_FONT_DIR or REMAINDER_PDFTOPPM to override local assets/tools. Original TXT files
remain the canonical sample inputs; PDFs add layout, not business facts.
"""
from pathlib import Path
from html import escape
import json
import os
import re
import subprocess
import shutil
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / 'public/samples'
QA = ROOT / '.artifacts/samples'
QA.mkdir(parents=True, exist_ok=True)
FONTS = Path(os.environ.get('REMAINDER_FONT_DIR', ROOT / 'assets/fonts'))
PDFTOPPM = os.environ.get('REMAINDER_PDFTOPPM') or shutil.which('pdftoppm')
if not PDFTOPPM:
    raise SystemExit('Install Poppler (pdftoppm) or set REMAINDER_PDFTOPPM. See docs/reproduce-assets.md.')
for name, fn in [('Sans', 'NotoSans-Regular.ttf'), ('SansBold', 'NotoSans-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONTS / fn)))

W, H = A4
X, RW = 42, W - 84
FOREST, INK = HexColor('#194d3b'), HexColor('#233c32')
MUTED, LINE, PALE, AMBER = map(HexColor, ['#617565', '#dce5da', '#f2f6ee', '#8b672b'])
records = []

def draw_pdf(stem, source_name):
    source = (SAMPLES / source_name).read_text().strip()
    lines = source.splitlines()
    target = SAMPLES / f'{stem}.pdf'
    c = canvas.Canvas(str(target), pagesize=A4, pageCompression=1)
    c.setTitle(lines[2] + ' — fictional Remainder sample')
    c.setAuthor('Shivam Gupta · Remainder')
    c.setSubject('Fictional document for testing. Not a real commercial document.')
    c.setFillColor(FOREST); c.rect(0, H-9, W, 9, fill=1, stroke=0)

    def txt(s, y, size=10, font='Sans', color=INK, x=X):
        c.setFont(font, size); c.setFillColor(color); c.drawString(x, H-y, s)

    def rule(y):
        c.setStrokeColor(LINE); c.setLineWidth(.7); c.line(X, H-y, W-X, H-y)

    def paragraph(s, y, size=10, leading=16, color=INK, font='Sans', width=RW, x=X):
        p = Paragraph(escape(s), ParagraphStyle('source', fontName=font, fontSize=size, leading=leading, textColor=color))
        _, h = p.wrap(width, H)
        p.drawOn(c, x, H-y-h)
        return h

    # Keep the canonical disclaimer first in extraction order and visible in print.
    txt(lines[0], 37, 8, color=AMBER)
    txt(lines[1], 88, 27, 'SansBold', FOREST)
    # Pure vector mark; no additional document facts or text.
    c.setStrokeColor(FOREST); c.setLineWidth(1.5)
    cx, cy = W-X-12, H-76
    p=c.beginPath(); p.moveTo(cx,cy+12); p.lineTo(cx+3,cy+3); p.lineTo(cx+12,cy); p.lineTo(cx+3,cy-3); p.lineTo(cx,cy-12); p.lineTo(cx-3,cy-3); p.lineTo(cx-12,cy); p.lineTo(cx-3,cy+3); p.close(); c.drawPath(p,stroke=1,fill=0)
    rule(113)
    txt(lines[2], 151, 19, 'SansBold', FOREST)

    blank = lines.index('')
    y = 182
    for value in lines[3:blank]:
        txt(value, y, 10, color=MUTED)
        y += 20
    rule(y+2)
    y += 24
    body = lines[blank+1:]
    first_tail = next((i for i, line in enumerate(body) if line and ' | ' not in line), len(body))
    # Product lines stay intact: quantity and explicit unit-price labels are source evidence.
    items = [line for line in body[:first_tail] if line]
    for line in items:
        c.setFillColor(PALE); c.roundRect(X, H-y-51, RW, 51, 5, fill=1, stroke=0)
        c.setFillColor(FOREST); c.rect(X, H-y-51, 3, 51, fill=1, stroke=0)
        size=min(9.0, (RW-24)/pdfmetrics.stringWidth(line,'Sans',1))
        if size < 7.8: raise ValueError(f'Item too wide for readable source row: {line}')
        txt(line, y+30, size, x=X+12)
        y += 61
    y += 16
    tail = body[first_tail:]
    for line in tail:
        if not line:
            y += 10
            continue
        if line.startswith(('Invoice total:', 'Credit total:')):
            c.setFillColor(FOREST); c.roundRect(X,H-y-48,RW,48,5,fill=1,stroke=0)
            txt(line,y+31,17,'SansBold',HexColor('#ffffff'),x=X+15)
            y += 70
        elif line.startswith(('Subtotal:', 'Tax:')):
            txt(line,y+11,11)
            y += 25
        else:
            height=paragraph(line,y,10,16,MUTED)
            y += height+12
    if y > H-50: raise ValueError(f'Content exceeds page for {stem}: {y}')
    rule(H-44)
    c.save()

    reader=PdfReader(target)
    if len(reader.pages)!=1: raise AssertionError('Expected exactly one page')
    extracted=reader.pages[0].extract_text()
    normalize=lambda v: re.sub(r'\s+',' ',v).strip()
    if normalize(extracted)!=normalize(source):
        raise AssertionError(f'Extracted text differs from canonical TXT for {stem}\n{extracted}')
    preview=QA/stem
    subprocess.run([PDFTOPPM,'-f','1','-singlefile','-r','130','-png',str(target),str(preview)],check=True)
    records.append({'pdf':str(target.relative_to(ROOT)),'source':source_name,'pages':1,'canonicalTextMatch':True,'characters':len(extracted),'preview':str(preview.with_suffix('.png').relative_to(ROOT))})
    return target

invoice = draw_pdf('northstar-invoice','Northstar-invoice-NF-1042.txt')
draw_pdf('northstar-delivery','Northstar-delivery-DN-771.txt')
draw_pdf('northstar-credit','Northstar-credit-CN-208.txt')
# High-resolution, lossless image for the browser's OCR path; same one-page source.
subprocess.run([PDFTOPPM,'-f','1','-singlefile','-r','200','-png',str(invoice),str(SAMPLES/'northstar-invoice')],check=True)
(QA/'validation.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps(records,indent=2))
