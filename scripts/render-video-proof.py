"""Render a separately labeled integration-evidence card for the silent walkthrough."""
from pathlib import Path
import os
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parent.parent
out=root/'.artifacts/video/live-proof.png';out.parent.mkdir(parents=True,exist_ok=True)
fonts=Path(os.environ.get('REMAINDER_FONT_DIR',root/'assets/fonts'))
f=lambda size,bold=False:ImageFont.truetype(str(fonts/('NotoSans-Bold.ttf' if bold else 'NotoSans-Regular.ttf')),size)
serif=ImageFont.truetype(str(fonts/'NotoSerif-Regular.ttf'),78)
im=Image.new('RGB',(1920,1080),'#f7f8f5');d=ImageDraw.Draw(im)
def text(x,y,t,font,color='#194d3b'):d.text((x,y),t,font=font,fill=color)
text(150,112,'INTEGRATION EVIDENCE  /  VERIFIED SEPARATELY',f(21,True))
text(150,183,'Real inference. Clear boundaries.',serif)
text(153,300,'Gemini 3.5 Flash-Lite · two synthetic cases · 23 September 2026',f(30), '#526957')
for x,label,claim,credit,remaining in [(150,'FERN & FLOUR  /  USD','216.00','144.00','72.00'),(1000,'HARBOR PANTRY  /  GBP','63.55','18.75','44.80')]:
 d.rounded_rectangle((x,414,x+760,744),radius=18,fill='#e9f0e5')
 text(x+32,449,label,f(21,True))
 text(x+32,510,f'{claim} claimed',f(37,True))
 text(x+32,570,f'{credit} verified credit note',f(31))
 text(x+32,636,f'{remaining} remains open',f(35,True))
text(153,807,'This walkthrough uses labeled sample replay.',f(29,True))
text(153,861,'Live checks establish integration on these fixtures, not customer traction or a broad accuracy score.',f(25),'#526957')
text(153,911,'Evorozen extraction adapter implemented; sponsor inference unavailable during verification.',f(25),'#526957')
text(153,982,'Evidence and limitations: docs/validation-ai.md  ·  Created by Shivam Gupta',f(21),'#526957')
im.save(out)
print(out)
