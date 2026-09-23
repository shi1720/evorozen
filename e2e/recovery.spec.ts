import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('sample recovery stays open after a partial credit and produces the correct follow-up', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the sample demo' }).click();
  await expect(page.getByText('Identified discrepancies', { exact: true })).toBeVisible();
  await expect(page.locator('.metric-card').first()).toContainText('$216.00');
  await page.getByRole('link', { name: 'Review findings', exact: true }).click();
  await expect(page.getByText('The paperwork, connected.')).toBeVisible();
  await expect(page.locator('.finding-card')).toHaveCount(2);
  const first = page.locator('.finding-card').first();
  await first.getByRole('button', { name: 'Invoice', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Unit price: USD 36.00');
  await expect(page.locator('mark')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  for (const check of await page.getByRole('checkbox', { name: 'Include in claim' }).all()) {
    await expect(check).toBeEnabled();
    await check.check();
    await expect(check).toBeChecked();
    await expect(check).toBeEnabled();
  }
  await page.getByRole('button', { name: 'Prepare claim', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('$216.00');
  await page.getByRole('button', { name: 'I reviewed it. Prepare claim.' }).click();
  await expect(page.getByText('Claim prepared', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Claim draft' }).click();
  await expect(page.getByRole('textbox', { name: 'Claim draft' })).toContainText('216.00');
  await page.getByRole('button', { name: 'I’ve sent this claim' }).click();
  await page.getByRole('button', { name: 'Yes, mark as sent' }).click();
  await expect(page.getByText('Awaiting credit', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add credit note', exact: true }).click();
  await page.getByRole('button', { name: 'Load the $144 sample credit note' }).click();
  await page.getByRole('button', { name: 'Save reviewed text' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Match new credit' }).click();
  await expect(page.getByRole('button', { name: 'Match new credit' })).toHaveCount(0);
  await page.getByRole('tab', { name: /Findings/ }).click();
  await page.getByRole('button', { name: 'Verify credit', exact: true }).click();
  await expect(page.getByText('Partially credited', { exact: true })).toBeVisible();
  await expect(page.locator('.outstanding-highlight')).toContainText('$72.00');
  const caseId = page.url().split('/cases/')[1].split('?')[0];
  const eml = await page.request.get(`/api/cases/${caseId}/export?format=eml`);
  expect(eml.status()).toBe(200);
  const raw = await eml.text();
  const body = Buffer.from(raw.split('\r\n\r\n')[1], 'base64').toString('utf8');
  expect(body).toContain('144.00');
  expect(body).toContain('72.00');
  for (const format of ['pdf', 'csv', 'json']) {
    const r = await page.request.get(`/api/cases/${caseId}/export?format=${format}`);
    expect(r.ok()).toBeTruthy();
    expect(r.headers()['content-disposition']).toContain('attachment');
  }
});

test('signup, persistence, empty state, and new case are usable without AI', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Your name', { exact: true }).fill('Pilot Reviewer');
  await page.getByLabel('Business name', { exact: true }).fill('Little Lantern Café');
  await page.getByLabel('Email address', { exact: true }).fill(`e2e-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('sunlit-kitchen-recovery-2026');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByText('Keep your recovery key safe.')).toBeVisible();
  await expect(page.locator('.recovery-code code')).not.toBeEmpty();
  await page.getByRole('button', { name: 'I saved my key. Open workspace.' }).click();
  await expect(page.getByText('Let’s put your first credit in sight.')).toBeVisible();
  await page.getByRole('button', { name: 'New recovery case', exact: true }).click();
  await page.getByLabel('Case name', { exact: true }).fill('Friday delivery');
  await page.getByLabel('Supplier name', { exact: true }).fill('Meadow Foods');
  await page.getByRole('button', { name: 'Create case', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Friday delivery' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Friday delivery' })).toBeVisible();
  await page.getByRole('button', { name: 'Add document', exact: true }).click();
  await page.getByLabel('Document name', { exact: true }).fill('Invoice text');
  await page
    .getByLabel('Evidence text', { exact: false })
    .fill(
      'Meadow Foods\nInvoice M-100\nCurrency: USD\nOats | Quantity: 12 cases | Unit price: USD 36.00',
    );
  await page.getByRole('button', { name: 'Save reviewed text' }).click();
  await page.getByRole('tab', { name: /Documents/ }).click();
  await expect(
    page.locator('.document-row').getByText('Invoice text', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login$/);
});

test('desktop overview has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the sample demo' }).click();
  await expect(page.getByText('Identified discrepancies', { exact: true })).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(result.violations).toEqual([]);
});

test('mobile navigation and evidence work without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the sample demo' }).click();
  await expect(page.getByText('Identified discrepancies', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Suppliers', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your suppliers' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Recovery cases', exact: true }).click();
  await page
    .getByRole('link', { name: /A delivery that came up short/ })
    .first()
    .click();
  await expect(page.getByText('The paperwork, connected.')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(result.violations).toEqual([]);
});

test('PDF upload produces reviewable evidence before it is saved', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the sample demo' }).click();
  await page.getByRole('link', { name: 'Review findings', exact: true }).click();
  await page.getByRole('button', { name: 'Add document', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles('public/samples/northstar-invoice.pdf');
  await expect(page.getByLabel('Evidence text', { exact: false })).toHaveValue(/NF-1042/);
  await expect(page.getByLabel('Evidence text', { exact: false })).toHaveValue(/36\.00/);
  await expect(page.getByRole('button', { name: 'Save reviewed text' })).toBeEnabled();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('tab', { name: /Documents/ }).click();
  await expect(page.locator('.document-row')).toHaveCount(3);
});
