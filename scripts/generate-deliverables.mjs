// Reproducible Remainder deck. Uses the Codex bundled artifact runtime.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const runtime = process.env.REMAINDER_ARTIFACT_RUNTIME;
const skill = process.env.REMAINDER_PRESENTATIONS_SKILL;
if (!runtime || !skill) throw new Error('Set REMAINDER_ARTIFACT_RUNTIME and REMAINDER_PRESENTATIONS_SKILL to your installed artifact runtime and presentation helpers. See docs/reproduce-assets.md.');
process.env.RUNTIME_NODE_MODULES = path.join(runtime, 'node/node_modules');
process.env.RUNTIME_NODE = path.join(runtime, 'node/bin/node');
const tmp = path.join(root, '.artifacts/remainder');
const out = path.join(root, 'deliverables');
await fs.mkdir(tmp, {recursive:true});
await fs.mkdir(out, {recursive:true});
const {Presentation, PresentationFile, FileBlob} = await import(pathToFileURL(path.join(runtime, 'node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const {finalizePresentation, applyPresentationChartFont} = await import(pathToFileURL(path.join(skill, 'container_tools/artifact_tool_utils.mjs')).href);
const C={paper:'#F7F8F5', forest:'#194D3B', mint:'#D9EBDF', ink:'#203A30', muted:'#63766C', amber:'#BA7B42', white:'#FFFFFF'};
const SANS='Arial', SERIF='Georgia';
const p=Presentation.create({slideSize:{width:1280,height:720}});
function text(s,words,x,y,w,h,size=28,extra={}) {
  const box=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  box.text=words;
  box.text.style={typeface:SANS,fontSize:size,color:C.ink,autoFit:'none',wrap:'square',verticalAlignment:'top',insets:{left:0,right:0,top:0,bottom:0},...extra};
  return box;
}
function slide(bg=C.paper){const s=p.slides.add();s.background.fill=bg;return s;}
function title(s,words){text(s,words,80,75,1120,132,56,{typeface:SERIF});}
function foot(s,n,words='Remainder / Shivam Gupta',dark=false){text(s,words,80,655,1060,32,17,{color:dark?C.mint:C.muted});text(s,String(n).padStart(2,'0'),1160,655,40,32,17,{color:dark?C.mint:C.muted,alignment:'right'});}
function notes(s,words){s.speakerNotes.textFrame.setText(words);}

// 1. Minimal typographic cover.
{
 const s=slide(C.forest);
 text(s,'Remainder',80,210,1110,148,112,{typeface:SERIF,color:C.paper});
 text(s,'A supplier-credit desk for\nindependent food businesses',88,385,870,108,36,{color:C.mint});
 foot(s,1,'Shivam Gupta / remainder-apex.onrender.com',true);
 notes(s,'Created by Shivam Gupta with AI-assisted research, design, and engineering. This deck presents a pre-launch product and commercial plan. Live preview: https://remainder-apex.onrender.com on Render with Neon PostgreSQL. Public source: https://github.com/shi1720/evorozen . Homepage and health endpoint checked September 23. No real customer traction is claimed.');
}
// 2. The problem is a handoff, made concrete without fabricated statistics.
{
 const s=slide(); title(s,'The supplier-credit gap');
 text(s,'“We’ll credit you.”',80,225,1110,115,76,{typeface:SERIF,color:C.forest});
 text(s,'The invoice records the charge.\nThe delivery note records the shortage.',84,395,535,120,28);
 text(s,'The credit arrives later.\nSomeone still has to check the remainder.',685,395,500,130,28);
 text(s,'A focused job for the owner or bookkeeper of an independent cafe.',84,567,1110,48,25,{color:C.muted});
 foot(s,2);
 notes(s,'Workflow hypothesis to validate with design partners. It is not a customer interview quote. Source context: Xero documents applying supplier credits separately from other credit transactions: https://central.xero.com/s/article/Apply-a-supplier-s-credit-to-a-bill . Research and competitor analysis: docs/research.md.');
}
// 3. Native chart with editable workbook values.
{
 const s=slide(); title(s,'A $72 remainder stays visible');
 text(s,'$216',80,208,530,110,84,{typeface:SERIF,color:C.forest});
 text(s,'reviewed shortage claim',84,319,700,40,28);
 const chart=s.charts.add('bar',{
  position:{left:80,top:390,width:1120,height:120},categories:['NF-1042'],
  series:[{name:'Credit note verified',values:[144],fill:C.forest,valuesFormatCode:'$0'},{name:'Still outstanding',values:[72],fill:C.amber,valuesFormatCode:'$0'}],
  barOptions:{direction:'bar',grouping:'stacked',overlap:100,gapWidth:30},hasLegend:false,
  xAxis:{visible:false,tickLabelPosition:'none',majorGridlines:null,line:{fill:'none',width:0}},
  yAxis:{visible:false,min:0,max:216,tickLabelPosition:'none',majorGridlines:null,line:{fill:'none',width:0}},
  chartFill:C.paper,plotAreaFill:C.paper,chartLine:{fill:'none',width:0},plotAreaLine:{fill:'none',width:0},
  dataLabels:{showValue:true,position:'center',textStyle:{typeface:SANS,fontSize:34,bold:true,fill:C.white}}
 });
 applyPresentationChartFont(chart,{fontFamily:SANS});
 text(s,'$144 credit note verified',84,526,725,45,29,{color:C.forest});
 text(s,'$72 still outstanding',842,526,360,45,29,{color:C.amber});
 foot(s,3,'Fictional USD example. Credit-note evidence does not establish cash received.');
 notes(s,'Illustrative data from the reproducible Fern & Flour fixture, not customer results. Northstar invoice NF-1042: 12 oat cases invoiced, 8 received, at $36 gives $144 shortage. 10 tomato cases invoiced, 7 received, at $24 gives $72 shortage. Four olive-oil tins received as invoiced gives zero shortage. Total claim $216. Credit CN-208 references NF-1042 and credits $144 oat drink. Remaining $72. Chart source values: credit-note verified 144 and outstanding 72, USD. Accounting application and cash receipt remain separate, unverified steps.');
}
// 4. Readable architecture roles with no decorative UI or invented screenshot.
{
 const s=slide();title(s,'Every amount has a source');
 const rows=[['AI interpretation','Gemini passed two live synthetic cases.\nAI proposes matching line items.'],['Human review','The owner checks source quotations.\nSigned Evorozen aliases aid later cases.'],['Deterministic checks','Integer-cent arithmetic and duplicate controls\nkeep the credit balance consistent.']];
 rows.forEach(([a,b],i)=>{const y=244+i*124;text(s,a,80,y,380,48,29,{bold:true,color:C.forest});text(s,b,505,y,690,98,27);});
 foot(s,4,'Gemini extraction + signed Evorozen memory verified. Sample footage uses replay.');
 notes(s,'Architecture: docs/architecture.md. Validation: docs/validation-ai.md. Gemini 3.5 Flash-Lite passed live synthetic USD 216/144/72 and independent GBP 63.55/18.75/44.80 packs on 23 September 2026. This is integration evidence, not an accuracy benchmark or real customer traction. Evorozen chat adapter is implemented; sponsor inference was unavailable during testing. A five-request live check of the production Evorozen memory module verified a signed alias write, HMAC-validated recall, scoped deletion and absent recall afterward. This is optional sponsor memory integration, not sponsor extraction. Public validation artifacts: docs/validation-ai.md. Explicit inference selection for the deployment is Gemini. Application code owns authorization, arithmetic, workflow state, and tenant-specific supplier aliases.');
}
// 5. Specific customer and competitive context.
{
 const s=slide(C.mint);title(s,'A small desk beside the bookkeeper');
 text(s,'Independent cafes, restaurants,\nand small food retailers',80,236,1105,102,40,{typeface:SERIF,color:C.forest});
 text(s,'A case begins with existing documents.\nIt ends with a reviewed claim, credit evidence,\nand a record of what remains open.',82,380,705,154,29);
 text(s,'No ERP connection\nrequired for the\ncore workflow.',935,386,270,150,28,{bold:true,color:C.forest});
 foot(s,5,'Existing alternatives: Supply Verify, Supy, Canals, accounting tools, and spreadsheets.');
 notes(s,'Positioning hypothesis, not a claim of exclusivity or proven superiority. Supply Verify already captures delivery notes, detects shortages and issues credit requests: https://www.supplyverify.ai/en/ . Supy provides hospitality invoice matching and broader procurement workflows: https://supy.io/product-features/invoice-receiving . Canals reconciles statements against ERP records: https://www.canals.ai/products/distributor-statement-reconciiation . Remainder differentiates through focused review and partial-credit follow-through for independent operators; validate with actual users.');
}
// 6. Pricing is a testable hypothesis.
{
 const s=slide();title(s,'A price to test with real operators');
 text(s,'$29',80,250,490,156,124,{typeface:SERIF,color:C.forest});
 text(s,'per location / month',85,417,590,44,29);
 text(s,'Proposed allowance: 100 claim packs\nwith a defined request budget.',688,259,510,100,29);
 text(s,'A small guided trial first.\nMeasure inference and support costs\nbefore expanding access.',688,421,510,132,28,{color:C.muted});
 foot(s,6,'Pricing hypothesis. Evorozen advertises the first 50 calls free, a finite launch allowance.');
 notes(s,'Price and allowance are proposed, not verified willingness to pay or implemented subscription billing. Unit-economics sensitivities and exclusions are in docs/go-to-market.md. Evorozen offer reviewed September 23, 2026: https://pulse.evorozen.com/dashboard says first 50 calls free, no card needed. It does not state a recurring monthly allowance. Paid API cost remains unverified. The sponsor adapter can use multiple extraction windows per analysis due to a 2,000-character prompt limit. Each outbound window and fallback consumes a call; do not assume two analyses equal two calls. At the illustrative $0.025/call, 100 packs with two analyses and 10 percent retries cost $5.50 in AI at one window per analysis, or $44 at eight windows, before other costs. See docs/go-to-market.md for assumptions.');
}
// 7. The next commercial action, not invented traction.
{
 const s=slide(C.forest);
 text(s,'Seeking five\ndesign partners',80,96,1090,180,67,{typeface:SERIF,color:C.paper});
 text(s,'Independent operators and hospitality bookkeepers',84,309,1105,60,31,{color:C.mint});
 text(s,'Observe a recent case.\nMeasure review time and corrections.\nAsk for a concrete paid commitment.',84,413,1060,138,31,{color:C.paper});
 text(s,'remainder-apex.onrender.com →',84,584,1080,44,28,{bold:true,color:C.mint});
 foot(s,7,'Public source / github.com/shi1720/evorozen',true);
 notes(s,'Five design partners is a recruitment target, not existing users or commitments. Seven-day launch plan and outreach drafts: docs/go-to-market.md. Creator: Shivam Gupta, with AI-assisted engineering. Repository: https://github.com/shi1720/evorozen . The live preview is deployed on Render with Neon PostgreSQL. No customer outcomes or paid revenue have been established in this deck. Click the app CTA to open https://remainder-apex.onrender.com .');
}

const candidate=path.join(tmp,'candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidate);
execFileSync(path.join(runtime,'python/bin/python3'),[path.join(root,'scripts/link-deck-ctas.py'),candidate],{stdio:'inherit'});
const revisionDir=path.join(root,'.artifacts/remainder-exports');
await fs.mkdir(revisionDir,{recursive:true});
const finalPath=path.join(revisionDir,`remainder-pitch-${Date.now()}.pptx`);
await finalizePresentation({
 workspaceDir:root,candidatePath:candidate,finalPath,pythonExecutable:path.join(runtime,'python/bin/python3'),
 integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],
 explicitTotalSlideCount:7,requiredNativeChartOwnerSlides:[3],requiredNativeTableOwnerSlides:[],
 materializeLiteralChartWorkbooks:true,fontPolicy:{basis:'design',families:[SANS,SERIF]},verifyArtifactToolImport:true,
 receiptPath:path.join(tmp,`${path.basename(finalPath)}.validation.json`)
});
const final=await PresentationFile.importPptx(await FileBlob.load(finalPath));
for(let i=0;i<final.slides.items.length;i++){
 const image=await final.export({slide:final.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(tmp,`slide-${i+1}.png`),new Uint8Array(await image.arrayBuffer()));
}
await fs.copyFile(finalPath,path.join(out,'remainder-pitch.pptx'));
console.log(`Created and rendered ${path.join(out,'remainder-pitch.pptx')}`);
