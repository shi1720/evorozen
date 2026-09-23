/** Record the actual app with two live AI analyses on fictional evidence.
 * Start an isolated app on port 3224 using OpenAI and no fallback first.
 * Generate narration with scripts/narrate-demo.mjs before recording.
 * A normal account is prepared through real APIs off-camera so no credentials are filmed.
 */
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const root = process.cwd();
const base = process.env.REMAINDER_DEMO_URL || 'http://localhost:3224';
const dir = path.join(root, '.artifacts/live-video');
const manifest = JSON.parse(await fs.readFile(path.join(dir, 'narration.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 800 }, recordVideo: { dir, size: { width: 1600, height: 800 } }, acceptDownloads: true, reducedMotion: 'reduce' });
const password = `VideoOnly-${randomBytes(18).toString('hex')}`;
const request = context.request;
const post = async (url, data) => {
  const res = await request.post(base + '/api' + url, { data, headers: { Origin: base } });
  if (!res.ok()) throw new Error(`${url}: HTTP ${res.status()}`);
  return res.json();
};
let registered = false;
let page, video, clock;
const marks = [], errors = [], proof = {};
async function scene(id, work) {
  const item = manifest.scenes.find(s => s.id === id);
  const start = (Date.now() - clock) / 1000;
  console.log(`Recording ${id}`);
  await work();
  await page.screenshot({ path: path.join(dir, 'frames', `${id}.png`) });
  const remaining = item.duration - (Date.now() - clock) / 1000 + start;
  if (remaining > 0 && !process.argv.includes('--fast-debug')) await page.waitForTimeout(remaining * 1000);
  marks.push({ id, start, end: (Date.now() - clock) / 1000, requestedDuration: item.duration });
}
async function removeCard() { await page.evaluate(() => document.querySelector('#video-title-card')?.remove()); }
async function card(kicker, headline, lines, footnote) {
  await page.evaluate(({ kicker, headline, lines, footnote }) => {
    document.querySelector('#video-title-card')?.remove();
    const element = document.createElement('section'); element.id = 'video-title-card';
    Object.assign(element.style, { position: 'fixed', inset: '0', zIndex: '999999', background: '#f5f6f0', color: '#164e3c', padding: '75px 116px', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: '"DM Sans",sans-serif' });
    const styles = [{ fontSize: '16px', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '27px' }, { fontFamily: '"DM Serif Display",Georgia,serif', fontSize: '74px', letterSpacing: '-2px', lineHeight: '1.05', maxWidth: '1240px' }, { fontSize: '29px', lineHeight: '1.45', color: '#526959', whiteSpace: 'pre-line', marginTop: '28px' }, { fontSize: '17px', lineHeight: '1.6', color: '#526959', marginTop: '38px', maxWidth: '1220px' }];
    [kicker, headline, lines, footnote].forEach((text, i) => { const p = document.createElement('div'); p.textContent = text; Object.assign(p.style, styles[i]); element.append(p); });
    document.body.append(element);
  }, { kicker, headline, lines, footnote });
}
try {
  const auth = await post('/auth/register', { name: 'Demo Presenter', workspaceName: 'Fern & Flour · fictional example', email: `film-${Date.now()}@example.test`, password, currency: 'USD' });
  registered = true;
  if (auth.user.isDemo) throw new Error('Recording must use a normal live-AI account.');
  await post('/suppliers', { name: 'Northstar Foods', email: '', aliases: ['OAT BARISTA 6X1L = barista oat drink'], notes: 'Invoice and delivery quantities are in cases; each oat case contains six 1L cartons.' });
  const created = await post('/cases', { title: 'A delivery that came up short', supplierName: 'Northstar Foods', invoiceReference: 'NF-1042' });
  const id = created.case.id;
  for (const [kind, name] of [['invoice', 'Northstar-invoice-NF-1042.txt'], ['delivery_note', 'Northstar-delivery-DN-771.txt'], ['supplier_message', 'Northstar-product-alias.txt']]) {
    await post(`/cases/${id}/documents`, { kind, name, text: await fs.readFile(path.join(root, 'public/samples', name), 'utf8') });
  }
  clock = Date.now();
  page = await context.newPage(); video = page.video();
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/app/cases/' + id);
  await page.waitForLoadState('networkidle');
  await scene('title', () => card('Remainder / supplier credits, accounted for', '“We’ll credit you.”', 'A $216 claim. A $144 credit.\nWhat happened to the other $72?', 'Fictional business records · Actual application workflow · AI-generated presenter voice'));
  await scene('intro', async () => { await removeCard(); await page.evaluate(() => window.scrollTo(0, 0)); });
  await scene('invoice', async () => {
    await page.getByRole('tab', { name: /^Documents/ }).click();
    await page.getByRole('button', { name: /^Northstar-invoice-NF-1042.txt/ }).first().click();
    await expect(page.getByRole('dialog')).toContainText('Unit price: USD 36.00');
  });
  await scene('receiving', async () => {
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('button', { name: /^Northstar-delivery-DN-771.txt/ }).first().click();
    await expect(page.getByRole('dialog')).toContainText('Received: 8 cases');
  });
  await scene('analyze', async () => {
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('tab', { name: /^Findings/ }).click();
    const response = page.waitForResponse(r => r.url().endsWith(`/api/cases/${id}/analyze`) && r.request().method() === 'POST', { timeout: 100000 });
    await page.getByRole('button', { name: 'Analyze documents', exact: true }).first().click();
    const result = await (await response).json();
    if (!result.case) throw new Error(`Live analysis failed: ${result.error?.code || 'unknown'}`);
    const a = result.case.analysis;
    if (a.provider !== 'openai') throw new Error('The analysis did not use OpenAI.');
    if (a.findings.filter(f => !f.needsReview).reduce((s, f) => s + f.amountCents, 0) !== 21600) throw new Error('Initial live shortage total differs from $216.');
    proof.initial = { provider: a.provider, traceId: a.traceId, sourceHash: a.sourceHash, durationMs: a.durationMs, findings: a.findings.map(f => ({ product: f.product, amountCents: f.amountCents, needsReview: f.needsReview })) };
    await expect(page.getByRole('checkbox', { name: 'Include in claim' })).toHaveCount(2);
    await page.getByText('OpenAI', { exact: true }).first().scrollIntoViewIfNeeded();
  });
  await scene('findings', async () => {
    await page.getByRole('checkbox', { name: 'Include in claim' }).first().scrollIntoViewIfNeeded();
    await page.locator('.finding-card').first().evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 95));
  });
  await scene('review', async () => {
    await page.getByRole('button', { name: 'Invoice', exact: true }).first().click();
    await page.waitForTimeout(2200);
    await page.getByRole('button', { name: 'Close dialog' }).click();
    for (let i = 0; i < 2; i++) {
      const box = page.getByRole('checkbox', { name: 'Include in claim' }).nth(i);
      await box.click(); await expect(box).toBeChecked(); await expect(box).toBeEnabled(); await page.waitForTimeout(650);
    }
  });
  await scene('approval', async () => {
    await page.getByRole('button', { name: 'Prepare claim', exact: true }).click();
    await page.waitForTimeout(2200);
    await page.getByRole('button', { name: 'I reviewed it. Prepare claim.' }).click();
    await page.getByRole('tab', { name: 'Claim draft' }).click();
    await page.getByRole('textbox', { name: 'Claim draft' }).scrollIntoViewIfNeeded();
  });
  await scene('export', async () => {
    for (const [name, file] of [['Evidence PDF', 'live-claim-evidence.pdf'], ['Email draft', 'live-claim-draft.eml']]) {
      const download = page.waitForEvent('download');
      await page.getByRole('link', { name, exact: true }).click();
      await (await download).saveAs(path.join(dir, file));
    }
  });
  await scene('credit', async () => {
    await page.getByRole('button', { name: 'Add credit note', exact: true }).click();
    await page.getByLabel('Document name').fill('Northstar-credit-CN-208.txt');
    await page.getByLabel('Evidence text').fill(await fs.readFile(path.join(root, 'public/samples/Northstar-credit-CN-208.txt'), 'utf8'));
    await page.getByLabel('Evidence text').scrollIntoViewIfNeeded();
  });
  await scene('match', async () => {
    await page.getByRole('button', { name: 'Save reviewed text' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('tab', { name: /^Findings/ }).click();
    const response = page.waitForResponse(r => r.url().endsWith(`/api/cases/${id}/analyze`) && r.request().method() === 'POST', { timeout: 100000 });
    await page.getByRole('button', { name: 'Match new credit' }).click();
    const result = await (await response).json();
    await fs.writeFile(path.join(dir, 'live-credit-response.json'), JSON.stringify(result, null, 2));
    const a = result.case?.analysis;
    if (a?.provider !== 'openai' || a.credits.length !== 1 || a.credits[0].amountCents !== 14400) throw new Error('Live credit extraction failed: ' + JSON.stringify({ error: result.error, provider: a?.provider, credits: a?.credits, warnings: a?.warnings }));
    proof.credit = { provider: a.provider, traceId: a.traceId, sourceHash: a.sourceHash, durationMs: a.durationMs, amountCents: a.credits[0].amountCents };
    await page.getByRole('button', { name: 'Inspect evidence', exact: true }).click();
    await page.waitForTimeout(1800);
    await page.getByRole('button', { name: 'Close dialog' }).click();
  });
  await scene('remainder', async () => {
    await page.getByRole('button', { name: 'Verify credit', exact: true }).click();
    await expect(page.getByText('Partially credited', { exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
  });
  await scene('followup', async () => {
    await page.getByRole('tab', { name: 'Claim draft' }).click();
    await page.getByRole('textbox', { name: 'Claim draft' }).scrollIntoViewIfNeeded();
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Follow-up draft', exact: true }).click();
    await (await download).saveAs(path.join(dir, 'live-followup.eml'));
    const eml = await fs.readFile(path.join(dir, 'live-followup.eml'), 'utf8');
    const followup = Buffer.from(eml.split('\r\n\r\n')[1].replace(/\s/g, ''), 'base64').toString('utf8');
    if (!followup.includes('72.00')) throw new Error('Follow-up export does not contain the remaining balance.');
    await card('Downloaded email draft / actual exported text', 'Only $72 remains outstanding.', followup.match(/Original reviewed request:[\s\S]+?(?=\n\n)/)[0] + '\n\n' + followup.match(/Please review the remaining[^.]+\./)[0], 'Verified against the actual downloaded .eml file. No supplier email was sent in this demonstration.');
  });
  await scene('architecture', () => card('Engineering / meaningful boundaries', 'AI proposes. Evidence decides.', 'OpenAI interprets the documents.\nApplication code checks the money.\nThe owner approves the claim.', 'Separately verified: signed Evorozen supplier-alias memory. No raw invoices or amounts in that memory.'));
  await scene('gtm', () => card('Go-to-market / proposed pilot', 'Start with one real case.', 'Independent operators + hospitality bookkeepers\nMeasure review time, corrections, and repeat use.\nPricing hypothesis: $29 / location / month.', 'Validate AI request costs and support time before scaling. No customer traction or revenue claimed.'));
  await scene('closing', () => card('Built by Shivam Gupta / Evorozen Apex', 'Remainder.', 'Know exactly what is still outstanding.\nremainder-desk.web.app', 'Fictional records · Real OpenAI analysis · AI-generated stock presenter voice\nSource: github.com/shi1720/evorozen'));
  const result = await (await request.get(`${base}/api/cases/${id}`)).json();
  const c = result.case;
  if (c.claimedCents !== 21600 || c.creditedCents !== 14400 || c.remainingCents !== 7200 || c.status !== 'partial') throw new Error('Final balance verification failed.');
  proof.final = { claimedCents: c.claimedCents, creditedCents: c.creditedCents, remainingCents: c.remainingCents, status: c.status };
  proof.expectedLiveInferenceRequests = 2;
  proof.recording = 'Normal account, fictional source documents, real OpenAI calls. Setup performed off camera. No mock or replay analysis.';
  proof.recordedAt = new Date().toISOString();
  if (errors.length) throw new Error('Uncaught page errors occurred.');
} catch (e) {
  console.error(e.message); process.exitCode = 1;
  if (page) await page.screenshot({ path: path.join(dir, 'failure.png'), fullPage: true });
} finally {
  if (registered) {
    const deleted = await request.delete(base + '/api/account', { data: { password }, headers: { Origin: base } });
    proof.cleanup = { status: deleted.status(), succeeded: deleted.ok() };
  }
  await context.close();
  const source = video ? await video.path() : null;
  await fs.writeFile(path.join(dir, 'recording.json'), JSON.stringify({ source, marks, errors, proof, passed: !process.exitCode }, null, 2));
  await browser.close();
  console.log(JSON.stringify({ passed: !process.exitCode, scenes: marks.length, errors: errors.length, ...proof.final }));
}
