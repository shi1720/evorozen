/** Hosted UI and recovery verification with zero live model requests.
 * node scripts/verify-hosted-followup.mjs --live --base=https://remainder-desk.web.app
 * Deletes its disposable normal account. A labeled demo is logged out and recorded
 * by ID for immediate administrative cleanup; otherwise the built-in expiry applies.
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

if (!process.argv.includes('--live')) {
  console.log(
    'No requests made. Add --live to verify hosted recovery and the labeled sample without live AI calls.',
  );
  process.exit(0);
}
const base = new URL(
  process.argv.find((a) => a.startsWith('--base='))?.slice(7) || 'https://remainder-desk.web.app',
).origin;
assert(base.startsWith('https://'));
const report = {
  timestamp: new Date().toISOString(),
  base,
  kind: 'hosted_recovery_and_demo_layout_followup',
  passed: false,
  liveModelRequests: 0,
  checks: [],
  responsive: [],
  browserErrors: [],
  cleanup: {},
};
const browser = await chromium.launch();
const normal = await browser.newContext({
  baseURL: base,
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const recovered = await browser.newContext({
  baseURL: base,
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const demo = await browser.newContext({
  baseURL: base,
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const page = await normal.newPage();
const recoveryPage = await recovered.newPage();
const demoPage = await demo.newPage();
for (const target of [page, recoveryPage, demoPage]) {
  target.setDefaultTimeout(25000);
  target.setDefaultNavigationTimeout(60000);
  target.on('pageerror', (error) => report.browserErrors.push(error.message));
}
const email = `recovery-${Date.now()}-${randomBytes(4).toString('hex')}@example.com`;
let password = `Recovery-review-${randomBytes(18).toString('hex')}`;
const privateValues = new Set([email, password]);
let registered = false;
const safeError = (error) => {
  let text = error instanceof Error ? error.message : 'Verification failed';
  for (const value of privateValues)
    if (value) text = text.replaceAll(value, '[private test value]');
  return text;
};
const check = (name) => {
  report.checks.push(name);
  console.log(`PASS ${name}`);
};
async function api(context, path, method = 'GET', data) {
  const response = await context.request.fetch(path, {
    method,
    ...(data === undefined ? {} : { data }),
  });
  assert(response.ok(), `${method} ${path} returned ${response.status()}`);
  return response.json();
}
async function deleteNormal() {
  const authentication = await recovered.request.get('/api/auth/me');
  if (authentication.status() === 401)
    await api(recovered, '/api/auth/login', 'POST', { email, password });
  const response = await recovered.request.delete('/api/account', { data: { password } });
  assert.equal(response.status(), 200);
  assert.equal((await recovered.request.get('/api/auth/me')).status(), 401);
  assert.equal(
    (await recovered.request.post('/api/auth/login', { data: { email, password } })).status(),
    401,
  );
  registered = false;
  report.cleanup.normalAccount = { deleted: true, sessionRejected: true, loginRejected: true };
}
try {
  const registration = await api(normal, '/api/auth/register', 'POST', {
    name: 'Fictional Recovery Reviewer',
    workspaceName: 'Fictional Recovery Cafe',
    email,
    password,
    currency: 'USD',
  });
  registered = true;
  const recoveryCode = registration.recoveryCode;
  privateValues.add(recoveryCode);
  const created = (
    await api(normal, '/api/cases', 'POST', {
      title: 'Temporary recovery verification',
      supplierName: 'Fictional Supplier',
    })
  ).case;
  await page.goto(`/app/cases/${created.id}`);
  await page
    .getByRole('heading', { name: 'Temporary recovery verification', exact: true })
    .waitFor();
  const nextPassword = `New-recovery-review-${randomBytes(18).toString('hex')}`;
  privateValues.add(nextPassword);
  await recoveryPage.goto('/recover');
  await recoveryPage.getByLabel('Email address', { exact: true }).fill(email);
  await recoveryPage.getByLabel('Recovery key', { exact: true }).fill(recoveryCode);
  await recoveryPage.getByLabel('New password', { exact: true }).fill(nextPassword);
  const reset = recoveryPage.waitForResponse(
    (response) =>
      response.url().endsWith('/auth/recover') && response.request().method() === 'POST',
  );
  await recoveryPage.getByRole('button', { name: 'Reset password', exact: true }).click();
  assert.equal((await reset).status(), 200);
  password = nextPassword;
  await recoveryPage.getByText('Keep your recovery key safe.').waitFor();
  const newCode = await recoveryPage.locator('.recovery-code code').innerText();
  privateValues.add(newCode);
  assert.notEqual(newCode, recoveryCode);
  assert.equal((await normal.request.get('/api/auth/me')).status(), 401);
  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: 'Recovery cases', exact: true }).click();
  await page.getByText('Your session ended. Sign in to continue where you left off.').waitFor();
  check('recovery rotates the key and revokes an existing Firebase session');
  await recoveryPage.getByRole('button', { name: 'Back to log in' }).click();
  await recoveryPage.getByLabel('Email address', { exact: true }).fill(email);
  await recoveryPage.getByLabel('Password', { exact: true }).fill(password);
  await recoveryPage.getByRole('button', { name: 'Log in', exact: true }).click();
  await recoveryPage.getByText('Identified discrepancies', { exact: true }).waitFor();
  await recoveryPage.goto(`/app/cases/${created.id}`);
  await recoveryPage
    .getByRole('heading', { name: 'Temporary recovery verification', exact: true })
    .waitFor();
  await recoveryPage.reload();
  await recoveryPage
    .getByRole('heading', { name: 'Temporary recovery verification', exact: true })
    .waitFor();
  assert.equal((await api(recovered, '/api/export')).cases.length, 1);
  check('recovered browser login, persistent case deep link, reload, and workspace export');
  await deleteNormal();
  check('normal test account deleted through the correct-password API');

  const sample = await api(demo, '/api/auth/demo', 'POST', {});
  report.demoWorkspaceId = sample.user.id;
  let record = (await api(demo, '/api/cases')).cases[0];
  record = (
    await api(demo, `/api/cases/${record.id}`, 'PATCH', {
      version: record.version,
      acceptedFindingIds: record.analysis.findings.map((f) => f.id),
    })
  ).case;
  record = (await api(demo, `/api/cases/${record.id}/claim`, 'POST', {})).case;
  record = (
    await api(demo, `/api/cases/${record.id}/documents`, 'POST', {
      kind: 'credit_note',
      name: 'Final hosted layout sample credit',
      text: await readFile('public/samples/Northstar-credit-CN-208.txt', 'utf8'),
    })
  ).case;
  record = (await api(demo, `/api/cases/${record.id}/analyze`, 'POST', {})).case;
  assert.equal(record.analysis.provider, 'demo');
  record = (
    await api(demo, `/api/cases/${record.id}/credits/verify`, 'POST', {
      version: record.version,
      documentId: record.analysis.credits[0].documentId,
    })
  ).case;
  assert.equal(record.claimedCents, 21600);
  assert.equal(record.creditedCents, 14400);
  assert.equal(record.remainingCents, 7200);
  report.sampleTotals = {
    claimedCents: 21600,
    creditedCents: 14400,
    remainingCents: 7200,
    provider: 'demo',
  };
  check('labeled sample reproduces the partial-credit state without live inference');
  await mkdir('output/screenshots/firebase-review', { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await demoPage.setViewportSize({ width, height: 900 });
    for (const [name, path] of [
      ['landing', '/'],
      ['dashboard', '/app'],
      ['case', `/app/cases/${record.id}`],
      ['settings', '/app/settings'],
    ]) {
      await demoPage.goto(path);
      await demoPage.locator('main h1').waitFor();
      await demoPage.evaluate(() => document.fonts.ready);
      const overflow = await demoPage.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      const violations = [320, 390].includes(width)
        ? (
            await new AxeBuilder({ page: demoPage }).withTags(['wcag2a', 'wcag2aa']).analyze()
          ).violations.map((v) => v.id)
        : [];
      report.responsive.push({ page: name, width, overflow, accessibilityViolations: violations });
      assert.equal(overflow, false, `${name} overflow at ${width}`);
      assert.deepEqual(violations, []);
      if (['dashboard', 'case'].includes(name) && [320, 1440].includes(width))
        await demoPage.screenshot({
          path: `output/screenshots/firebase-review/final-sample-${name}-${width}.png`,
          fullPage: true,
        });
    }
  }
  check('16 hosted viewport/page combinations fit without overflow; mobile axe checks are clean');
  await demoPage.setViewportSize({ width: 1440, height: 1000 });
  await demoPage.goto(`/app/cases/${record.id}`);
  const rerun = demoPage.waitForRequest(
    (request) => request.url().endsWith('/analyze') && request.method() === 'POST',
  );
  await demoPage.getByRole('button', { name: 'Run sample again', exact: true }).click();
  assert.deepEqual((await rerun).postDataJSON(), { force: true });
  await demoPage.getByText('Analysis complete. Every finding is ready for inspection.').waitFor();
  check('fresh-analysis UI submits force:true and preserves the approved sample claim');
  assert.equal((await api(demo, `/api/cases/${record.id}`)).case.remainingCents, 7200);
  assert.deepEqual(report.browserErrors, []);
  await api(demo, '/api/auth/logout', 'POST', {});
  assert.equal((await demo.request.get('/api/auth/me')).status(), 401);
  report.cleanup.demo = {
    sessionRevoked: true,
    workspaceExpiryDays: 7,
    workspaceId: sample.user.id,
  };
  report.passed = true;
} catch (error) {
  report.error = safeError(error);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  if (registered) {
    try {
      await deleteNormal();
    } catch (error) {
      report.cleanup.normalAccount = { deleted: false, error: safeError(error) };
      report.passed = false;
      process.exitCode = 1;
    }
  }
  if (report.demoWorkspaceId && !report.cleanup.demo) {
    try {
      await api(demo, '/api/auth/logout', 'POST', {});
      report.cleanup.demo = {
        sessionRevoked: true,
        workspaceId: report.demoWorkspaceId,
        workspaceExpiryDays: 7,
      };
    } catch (error) {
      report.cleanup.demo = { workspaceId: report.demoWorkspaceId, error: safeError(error) };
    }
  }
  await mkdir('docs/validation', { recursive: true });
  await writeFile('docs/validation/firebase-followup.json', JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  console.log(
    JSON.stringify({
      passed: report.passed,
      liveModelRequests: 0,
      report: 'docs/validation/firebase-followup.json',
      cleanup: report.cleanup,
    }),
  );
}
