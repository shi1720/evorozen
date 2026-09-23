"""Attach native PowerPoint hyperlinks to the deck's visible live-app/repo CTAs."""
from pathlib import Path
import sys
import zipfile
from lxml import etree as E
p=Path(sys.argv[1])
NS={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
REL='http://schemas.openxmlformats.org/package/2006/relationships'
with zipfile.ZipFile(p) as z:files={name:z.read(name) for name in z.namelist()}
count=0
for name,data in list(files.items()):
 if not name.startswith('ppt/slides/slide') or not name.endswith('.xml'):continue
 root=E.fromstring(data);relname=name.rsplit('/',1)[0]+'/_rels/'+name.rsplit('/',1)[1]+'.rels'
 rels=E.fromstring(files[relname]) if relname in files else E.Element('{'+REL+'}Relationships',nsmap={None:REL})
 changed=False
 for shape in root.findall('.//p:sp',NS):
  value=''.join(shape.xpath('.//a:t/text()',namespaces=NS))
  url='https://remainder-desk.web.app' if 'remainder-desk.web.app' in value else 'https://github.com/shi1720/evorozen' if 'github.com/shi1720/evorozen' in value else None
  if not url:continue
  rid='rIdRemainderLink'+str(count+1)
  rel=E.SubElement(rels,'{'+REL+'}Relationship',Id=rid,Type=NS['r']+'/hyperlink',Target=url,TargetMode='External')
  nv=shape.find('p:nvSpPr/p:cNvPr',NS)
  for prior in nv.findall('a:hlinkClick',NS):nv.remove(prior)
  E.SubElement(nv,'{'+NS['a']+'}hlinkClick',{'{'+NS['r']+'}id':rid})
  count+=1;changed=True
 if changed:files[name]=E.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True);files[relname]=E.tostring(rels,xml_declaration=True,encoding='UTF-8',standalone=True)
if count<2:raise AssertionError('Expected live app and source CTAs')
with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in files.items():z.writestr(name,data)
print(f'Attached {count} native CTA hyperlinks')
