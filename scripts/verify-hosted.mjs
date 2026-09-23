/** Explicit hosted release check using one disposable fictional workspace.
 * node scripts/verify-hosted.mjs --live --base=https://remainder-desk.web.app
 * Makes at most two live analysis requests and deletes the account in finally.
 * Credentials and recovery keys remain in process memory and are never archived.
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

if (!process.argv.includes('--live')) {
  console.log(
    'No requests made. Add --live to run two AI analyses against one disposable fictional workspace.',
  );
  process.exit(0);
}
const base = new URL(
  process.argv.find((a) => a.startsWith('--base='))?.slice(7) || 'https://remainder-desk.web.app',
).origin;
if (!base.startsWith('https://')) throw new Error('Hosted verification requires HTTPS.');
const reportPath = 'docs/validation/firebase-browser-workflow.json';
const screenshotDir = 'output/screenshots/firebase-review';
await mkdir(screenshotDir, { recursive: true });
await mkdir('docs/validation', { recursive: true });
const email = `release-${Date.now()}-${randomBytes(4).toString('hex')}@example.com`;
let password = `Fictional-release-${randomBytes(18).toString('hex')}`;
let recoveryKey = '';
const privateValues = new Set([email, password]);
const safeError = (error) => {
  let message = error instanceof Error ? error.message : 'Verification failed';
  for (const value of privateValues)
    if (value) message = message.replaceAll(value, '[private test value]');
  return message;
};
let registered = false;
let modelRequests = 0;
const report = {
  timestamp: new Date().toISOString(),
  base,
  kind: 'disposable_fictional_hosted_browser_verification',
  passed: false,
  checks: [],
  analyses: [],
  exports: [],
  responsive: [],
  browserErrors: [],
  cleanup: {},
};
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: base,
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
page.setDefaultNavigationTimeout(60000);
page.on('pageerror', (error) => report.browserErrors.push(error.message));
const check = (name, detail = true) => {
  report.checks.push({ name, detail });
  console.log(`PASS ${name}`);
};
async function json(path, options = {}) {
  const response = await context.request.fetch(path, options);
  assert(response.ok(), `${options.method || 'GET'} ${path} returned ${response.status()}`);
  return response.json();
}
async function saveFile(kind, path, expected) {
  await page.getByRole('button', { name: /^(Add document|Add credit note)$/ }).click();
  await page.getByRole('combobox', { name: /Document type/ }).selectOption(kind);
  await page.locator('input[type=file]').setInputFiles(path);
  await page.getByLabel('Evidence text', { exact: false }).filter({ visible: true }).waitFor();
  await page.waitForFunction(
    ({ expected }) => document.querySelector('.document-textarea')?.value.includes(expected),
    { expected },
  );
  await page.getByRole('button', { name: 'Save reviewed text' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}
async function analyze() {
  assert(modelRequests < 2, 'Bounded to two analysis requests');
  modelRequests++;
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/analyze') && r.request().method() === 'POST',
    { timeout: 120000 },
  );
  await page
    .getByRole('button', {
      name: /^(Analyze documents|Match new credit|Run AI again|Run sample again)$/,
    })
    .first()
    .click();
  const result = await response;
  assert(result.ok(), `Analysis ${modelRequests} returned HTTP ${result.status()}`);
  const record = (await result.json()).case;
  assert.equal(record.analysis.provider, 'openai');
  report.analyses.push({
    traceId: record.analysis.traceId,
    provider: record.analysis.provider,
    durationMs: record.analysis.durationMs,
    findings: record.analysis.findings.map((f) => ({
      product: f.product,
      amountCents: f.amountCents,
      needsReview: f.needsReview,
    })),
    credits: record.analysis.credits.map((c) => ({
      reference: c.reference,
      amountCents: c.amountCents,
    })),
  });
  return record;
}
try {
  assert.equal((await context.request.get('/api/health')).status(), 200);
  await page.goto('/signup');
  await page.getByLabel('Your name', { exact: true }).fill('Fictional Release Reviewer');
  await page.getByLabel('Business name', { exact: true }).fill('Fictional Fern and Flour');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const registration = page.waitForResponse(
    (response) =>
      response.url().endsWith('/auth/register') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  assert.equal((await registration).status(), 201);
  registered = true;
  await page.getByText('Keep your recovery key safe.').waitFor();
  recoveryKey = await page.locator('.recovery-code code').innerText();
  privateValues.add(recoveryKey);
  assert(recoveryKey.length > 20);
  await page.getByRole('button', { name: 'I saved my key. Open workspace.' }).click();
  await page.getByText('Let’s put your first credit in sight.').waitFor();
  const session = (await context.cookies()).find((c) => c.name === '__session');
  assert(session?.secure && session.httpOnly && session.sameSite === 'Lax');
  assert.equal(session.domain, new URL(base).hostname);
  check('browser signup and Firebase __session cookie', {
    secure: session.secure,
    httpOnly: session.httpOnly,
    sameSite: session.sameSite,
  });
  const settings = await json('/api/settings');
  assert.equal(settings.engine.provider, 'openai');
  assert.equal(settings.engine.configured, true);
  check('OpenAI configured on hosted backend');

  await page.getByRole('link', { name: 'Suppliers', exact: true }).click();
  await page.getByRole('button', { name: 'Add supplier', exact: true }).click();
  await page.getByLabel('Supplier name', { exact: true }).fill('Northstar Foods');
  await page.getByLabel('Contact email', { exact: false }).fill('accounts@northstar.example');
  await page
    .getByLabel('Known aliases', { exact: false })
    .fill('OAT BARISTA 6X1L = barista oat drink');
  await page
    .getByLabel('Supplier memory', { exact: true })
    .fill('Invoice and delivery quantities are in cases; each oat case contains six 1L cartons.');
  await page.getByRole('button', { name: 'Save supplier' }).click();
  await page.getByRole('heading', { name: 'Northstar Foods', exact: true }).waitFor();
  check('supplier alias and pack-unit notes saved in UI');

  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await page.getByRole('button', { name: 'New recovery case', exact: true }).click();
  await page.getByLabel('Case name', { exact: true }).fill('Fictional hosted release check');
  await page.getByLabel('Supplier name', { exact: true }).fill('Northstar Foods');
  await page.getByLabel('Invoice reference', { exact: false }).fill('NF-1042');
  await page.getByLabel('Follow-up date', { exact: false }).fill('2026-09-30');
  await page.getByRole('button', { name: 'Create case', exact: true }).click();
  await page
    .getByRole('heading', { name: 'Fictional hosted release check', exact: true })
    .waitFor();
  const casePath = new URL(page.url()).pathname;
  const caseId = casePath.split('/').at(-1);
  await page.reload();
  await page
    .getByRole('heading', { name: 'Fictional hosted release check', exact: true })
    .waitFor();
  check('normal account case creation, deep link, and reload persistence');
  await saveFile('invoice', 'public/samples/northstar-invoice.pdf', 'NF-1042');
  check('hosted PDF worker extraction, review, and save');

  await page.getByRole('button', { name: 'Add document', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles('public/samples/northstar-invoice.png');
  await page.waitForFunction(
    () => document.querySelector('.document-textarea')?.value.includes('NF-1042'),
    null,
    { timeout: 120000 },
  );
  const ocr = await page.getByLabel('Evidence text', { exact: false }).inputValue();
  assert(ocr.includes('36.00'));
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  check('hosted image OCR under production CSP, reviewed without duplicate save');
  await saveFile(
    'delivery_note',
    'public/samples/Northstar-delivery-DN-771.txt',
    'Received: 8 cases',
  );
  await saveFile(
    'supplier_message',
    'public/samples/Northstar-product-alias.txt',
    'six 1L cartons',
  );
  check('TXT receiving note and explicit pack equivalence saved');
  let record = await analyze();
  assert.equal(
    record.analysis.findings
      .filter((f) => !f.needsReview)
      .reduce((sum, f) => sum + f.amountCents, 0),
    21600,
  );
  assert.equal(record.analysis.findings.filter((f) => f.needsReview).length, 0);
  await page
    .locator('.finding-card')
    .first()
    .getByRole('button', { name: 'Invoice', exact: true })
    .click();
  await page.locator('mark').waitFor();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  for (const checkbox of await page.getByRole('checkbox', { name: 'Include in claim' }).all()) {
    await checkbox.check();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.finding-checkbox input')].every((e) => !e.disabled),
    );
  }
  await page.getByRole('button', { name: 'Prepare claim', exact: true }).click();
  await page.getByRole('button', { name: 'I reviewed it. Prepare claim.' }).click();
  await page.getByText('Claim prepared', { exact: true }).waitFor();
  check('live OpenAI shortages, linked evidence, explicit selection, and claim approval');
  await page.getByRole('tab', { name: 'Claim draft', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Evidence PDF', exact: true }).click();
  const file = await download;
  assert.equal(await file.failure(), null);
  assert(file.suggestedFilename().endsWith('.pdf'));
  check('browser evidence PDF download through Firebase');
  await page.getByRole('button', { name: 'I’ve sent this claim' }).click();
  await page.getByRole('button', { name: 'Yes, mark as sent' }).click();
  await page.getByText('Awaiting credit', { exact: true }).waitFor();
  await saveFile(
    'credit_note',
    'public/samples/Northstar-credit-CN-208.txt',
    'Credit total: USD 144.00',
  );
  record = await analyze();
  assert.equal(record.analysis.credits.length, 1);
  await page.getByRole('tab', { name: /Findings/ }).click();
  await page.getByRole('button', { name: 'Verify credit', exact: true }).click();
  await page.getByText('Partially credited', { exact: true }).waitFor();
  record = (await json(`/api/cases/${caseId}`)).case;
  assert.equal(record.claimedCents, 21600);
  assert.equal(record.creditedCents, 14400);
  assert.equal(record.remainingCents, 7200);
  assert.equal(record.status, 'partial');
  report.totals = {
    currency: record.currency,
    claimedCents: record.claimedCents,
    creditedCents: record.creditedCents,
    remainingCents: record.remainingCents,
    status: record.status,
  };
  check('live partial credit reconciliation retains USD 72 remainder');
  for (const format of ['pdf', 'csv', 'json', 'eml']) {
    const response = await context.request.get(`/api/cases/${caseId}/export?format=${format}`);
    assert.equal(response.status(), 200);
    assert(response.headers()['content-disposition'].includes('attachment'));
    const body = await response.body();
    assert(body.length > 100);
    if (format === 'pdf') assert(body.toString('utf8', 0, 5).startsWith('%PDF'));
    if (format === 'eml') {
      const content = Buffer.from(body.toString().split('\r\n\r\n')[1], 'base64').toString();
      assert(content.includes('72.00') && content.includes('144.00'));
    }
    report.exports.push({ format, status: response.status(), bytes: body.length });
  }
  const exported = await json('/api/export');
  assert.equal(exported.cases.length, 1);
  check('PDF, CSV, JSON, EML and workspace export preserve balances');

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, path] of [
      ['dashboard', '/app'],
      ['case', casePath],
      ['settings', '/app/settings'],
    ]) {
      await page.goto(path);
      await page.locator('main h1').waitFor();
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${name} overflow at ${width}`,
      );
      const violations =
        width === 390
          ? (
              await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
            ).violations.map((v) => v.id)
          : [];
      assert.deepEqual(violations, []);
      report.responsive.push({
        page: name,
        width,
        overflow: false,
        accessibilityViolations: violations,
      });
      if (name === 'case' && [390, 1440].includes(width))
        await page.screenshot({ path: `${screenshotDir}/live-case-${width}.png`, fullPage: true });
    }
  }
  check('responsive normal workspace and mobile accessibility');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.goto('/recover');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Recovery key', { exact: true }).fill(recoveryKey);
  const nextPassword = `Recovered-release-${randomBytes(18).toString('hex')}`;
  privateValues.add(nextPassword);
  await page.getByLabel('New password', { exact: true }).fill(nextPassword);
  const recovery = page.waitForResponse(
    (response) =>
      response.url().endsWith('/auth/recover') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  assert.equal((await recovery).status(), 200);
  password = nextPassword;
  await page.getByText('Keep your recovery key safe.').waitFor();
  assert.notEqual(await page.locator('.recovery-code code').innerText(), recoveryKey);
  recoveryKey = '';
  await page.getByRole('button', { name: 'Back to log in' }).click();
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByText('Identified discrepancies', { exact: true }).waitFor();
  await page.goto(casePath);
  await page.getByText('Partially credited', { exact: true }).waitFor();
  assert.equal((await json(`/api/cases/${caseId}`)).case.remainingCents, 7200);
  check('password recovery rotates key, login restores persistent case');
  assert.deepEqual(report.browserErrors, []);
  report.passed = true;
} catch (error) {
  report.error = safeError(error);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  report.modelRequests = modelRequests;
  if (registered) {
    try {
      const auth = await context.request.get('/api/auth/me');
      if (auth.status() === 401)
        await json('/api/auth/login', { method: 'POST', data: { email, password } });
      const deletion = await context.request.delete('/api/account', { data: { password } });
      assert.equal(deletion.status(), 200);
      assert.equal((await context.request.get('/api/auth/me')).status(), 401);
      const login = await context.request.post('/api/auth/login', { data: { email, password } });
      assert.equal(login.status(), 401);
      report.cleanup = {
        deleted: true,
        oldSessionRejected: true,
        deletedAccountLoginRejected: true,
      };
      console.log('PASS disposable account deleted and session revoked');
    } catch (error) {
      report.cleanup = { deleted: false, error: safeError(error) };
      report.passed = false;
      process.exitCode = 1;
      console.error('Account cleanup failed; inspect sanitized report.');
    }
  }
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  console.log(
    JSON.stringify({ passed: report.passed, modelRequests, reportPath, cleanup: report.cleanup }),
  );
}
