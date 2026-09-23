"""Create Remainder's one-page, source-linked pitch brief with ReportLab."""
from pathlib import Path
import os
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
FONTS = Path(os.environ.get('REMAINDER_FONT_DIR', ROOT / 'assets/fonts'))
for name, filename in [('Sans','NotoSans-Regular.ttf'),('SansBold','NotoSans-Bold.ttf'),('Serif','NotoSerif-Regular.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(FONTS/filename)))
OUT = ROOT/'deliverables/remainder-brief.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
W,H=595.276,841.89
PAPER,FOREST,MINT,INK,MUTED,AMBER=map(HexColor,['#F7F8F5','#194D3B','#D9EBDF','#203A30','#63766C','#BA7B42'])
c=canvas.Canvas(str(OUT),pagesize=(W,H))
c.setTitle('Remainder - Supplier-credit desk')
c.setAuthor('Shivam Gupta')
c.setSubject('Pre-launch product brief for Evorozen Apex 2026')
c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0)

def line(x,y,text,font='Sans',size=11,color=INK):
    c.setFont(font,size);c.setFillColor(color);c.drawString(x,H-y,text)
def para(x,y,width,text,size=11,leading=16,color=INK,font='Sans'):
    style=ParagraphStyle('p',fontName=font,fontSize=size,leading=leading,textColor=color)
    p=Paragraph(text,style);_,h=p.wrap(width,H);p.drawOn(c,x,H-y-h);return h
def rule(y):
    c.setStrokeColor(MINT);c.setLineWidth(1);c.line(44,H-y,W-44,H-y)

line(44,49,'EVOROZEN APEX 2026',size=9,color=MUTED)
line(44,109,'Remainder',font='Serif',size=48,color=FOREST)
para(46,127,500,'A supplier-credit desk for independent food businesses.',size=15,leading=21)
line(46,181,'Created by Shivam Gupta with AI-assisted engineering',size=9.5,color=MUTED)
rule(203)

line(44,230,'THE MOMENT THAT MATTERS',font='SansBold',size=10,color=FOREST)
para(44,244,507,'A cafe reports a short delivery. A credit note arrives days later.<br/>It covers the oat drink. The missing tomatoes still need a credit.',size=11.5,leading=17)

for x,amount,label,col in [(44,'$216','Reviewed claim',FOREST),(225,'$144','Credit note verified',FOREST),(421,'$72','Still outstanding',AMBER)]:
    line(x,335,amount,font='Serif',size=40,color=col)
    line(x,359,label,size=10,color=MUTED)
para(44,379,507,'Fictional USD example. A verified credit note does not establish cash received or a credit applied to a bill.',size=9.3,leading=13,color=MUTED)
rule(418)

line(44,447,'THE PRODUCT',font='SansBold',size=10,color=FOREST)
para(44,461,235,'Bring invoice and receiving evidence into one case. Review AI-proposed findings with source quotations. Export the claim and evidence PDF. Match a later credit note and keep the remainder open.',size=10.8,leading=16)
line(318,447,'THE AI BOUNDARY',font='SansBold',size=10,color=FOREST)
para(318,461,232,'OpenAI gpt-5.4-mini proposes findings. Code validates evidence and money. The film shows two real AI requests. Optional signed Evorozen memory was verified separately; it recalls reviewed supplier aliases.',size=10.8,leading=16)

line(44,578,'THE FIRST CUSTOMERS',font='SansBold',size=10,color=FOREST)
para(44,592,235,'Independent cafes and hospitality bookkeepers. Begin with recent, redacted cases and measure review time, corrections, repeat use, and paid commitments.',size=10.8,leading=16)
line(318,578,'THE BUSINESS HYPOTHESIS',font='SansBold',size=10,color=FOREST)
para(318,592,232,'$29 per location per month for 100 claim packs with a defined request budget. A guided trial comes first. Provider cost and support time determine a viable allowance.',size=10.8,leading=16)

rule(701)
para(44,716,507,'Live on Firebase Hosting + Cloud Run + Neon PostgreSQL. Six fixed synthetic model cases passed. The narrated film follows a real two-stage account workflow with fictional documents. No customer traction or cash recovery is claimed.',size=8.8,leading=12,color=MUTED)
line(44,770,'Evidence: docs/validation-ai.md and docs/validation-video.md',size=8,color=MUTED)
c.linkURL('https://github.com/shi1720/evorozen/blob/main/docs/validation-ai.md',(44,H-774,410,H-760),relative=0,thickness=0)
line(44,791,'Open the live app: remainder-desk.web.app',font='SansBold',size=11,color=FOREST)
c.linkURL('https://remainder-desk.web.app',(44,H-795,440,H-779),relative=0,thickness=0)
line(44,817,'github.com/shi1720/evorozen',font='SansBold',size=10,color=FOREST)
c.linkURL('https://github.com/shi1720/evorozen',(44,H-821,300,H-805),relative=0,thickness=0)
line(428,817,'23 September 2026',size=8.5,color=MUTED)
c.showPage();c.save()
reader=PdfReader(str(OUT))
assert len(reader.pages)==1
text=reader.pages[0].extract_text()
for expected in ['$216','$144','$72','Shivam Gupta','gpt-5.4-mini','remainder-desk.web.app']:
    assert expected in text,expected
for stale in ['onrender.com','Gemini','\u2014']:
    assert stale not in text,stale
print(OUT)
