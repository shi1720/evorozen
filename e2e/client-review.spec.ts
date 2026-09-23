import { test, expect } from '@playwright/test';

async function sample(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the sample demo' }).click();
  await expect(page.getByText('Identified discrepancies', { exact: true })).toBeVisible();
}

test('failed document replacement preserves the matching reviewed name and text', async ({
  page,
}) => {
  await sample(page);
  await page.getByRole('link', { name: 'Review findings', exact: true }).click();
  await page.getByRole('button', { name: 'Add document', exact: true }).click();
  await page.getByLabel('Document name', { exact: true }).fill('Reviewed receiving note');
  await page
    .getByLabel('Evidence text', { exact: false })
    .fill('These are the original reviewed quantities: eight oat cases.');
  await page.locator('input[type=file]').setInputFiles({
    name: 'unreadable.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('broken\0binary'),
  });
  await expect(page.getByRole('alert')).toContainText('does not look like a text file');
  await expect(page.getByLabel('Document name', { exact: true })).toHaveValue(
    'Reviewed receiving note',
  );
  await expect(page.getByLabel('Evidence text', { exact: false })).toHaveValue(
    'These are the original reviewed quantities: eight oat cases.',
  );
  await expect(page.getByRole('button', { name: 'Save reviewed text' })).toBeEnabled();
});

test('claim downloads require saving edited wording and exports contain the saved changes', async ({
  page,
}) => {
  await sample(page);
  await page.getByRole('link', { name: 'Review findings', exact: true }).click();
  const firstFinding = page.getByRole('checkbox', { name: 'Include in claim' }).first();
  await firstFinding.check();
  await expect(firstFinding).toBeEnabled();
  await page.getByRole('button', { name: 'Prepare claim', exact: true }).click();
  await page.getByRole('button', { name: 'I reviewed it. Prepare claim.' }).click();
  await expect(page.getByText('Claim prepared', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Claim draft', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Claim draft', exact: true });
  const original = await editor.inputValue();
  await editor.fill(original + '\nPlease confirm the credit reference with your reply.');
  await expect(page.locator('.unsaved-note')).toContainText('unsaved wording');
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeDisabled();
  await expect(page.locator('.claim-actions [aria-disabled="true"]')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'I’ve sent this claim' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(editor).toHaveValue(original);
  await editor.fill(original + '\nPlease confirm the credit reference with your reply.');
  await page.getByRole('button', { name: 'Save wording' }).click();
  await expect(page.getByText('Claim wording saved.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeEnabled();
  const id = page.url().split('/cases/')[1].split('?')[0];
  const exported = await page.request.get(`/api/cases/${id}/export?format=eml`);
  expect(exported.ok()).toBeTruthy();
  const body = Buffer.from((await exported.text()).split('\r\n\r\n')[1], 'base64').toString('utf8');
  expect(body).toContain('Please confirm the credit reference with your reply.');
});

test('mobile navigation is keyboard-contained and document search and unknown tabs recover clearly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  const sidebar = page.locator('.sidebar');
  await expect(sidebar.getByRole('link', { name: 'Remainder home' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(sidebar.getByRole('button', { name: 'Log out' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(sidebar.getByRole('link', { name: 'Remainder home' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await expect(sidebar).not.toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Documents', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search documents' }).fill('no such supplier exists');
  await expect(page.getByRole('heading', { name: 'No matching documents.' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search documents' }).fill('');
  await page.locator('.document-card').first().click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.goto(page.url().split('?')[0] + '?tab=unrecognized');
  await expect(page.getByRole('tab', { name: /Findings/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText('The paperwork, connected.')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});

test('a temporary session check failure offers a retry without pretending the user signed out', async ({
  page,
}) => {
  let fail = true;
  await page.route('**/api/auth/me', async (route) => {
    if (fail)
      await route.fulfill({
        status: 503,
        json: { error: 'The workspace is temporarily unavailable.' },
      });
    else await route.continue();
  });
  await page.goto('/app/cases');
  await expect(
    page.getByRole('heading', { name: 'Let’s reconnect your workspace.' }),
  ).toBeVisible();
  await expect(page).toHaveURL('/app/cases');
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page).toHaveURL('/login');
});

test('an expired session can sign back in to the requested case list', async ({ page }) => {
  const credentials = {
    email: `expiry-${Date.now()}@example.com`,
    password: 'return-to-my-workspace-2026',
  };
  const register = await page.request.post('/api/auth/register', {
    data: {
      ...credentials,
      name: 'Session Reviewer',
      workspaceName: 'Session Cafe',
      currency: 'USD',
    },
  });
  expect(register.status()).toBe(201);
  await page.goto('/app');
  await expect(page.getByText('Let’s put your first credit in sight.')).toBeVisible();
  expect((await page.request.post('/api/auth/logout', { data: {} })).status()).toBe(200);
  await page.getByRole('link', { name: 'Recovery cases', exact: true }).click();
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('status')).toContainText('Your session ended');
  await page.getByLabel('Email address', { exact: true }).fill(credentials.email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL('/app/cases');
  await expect(page.getByRole('heading', { name: 'Recovery cases', exact: true })).toBeVisible();
});

test('a follow-up calendar date stays on the chosen day west of UTC', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ timezoneId: 'America/Los_Angeles', baseURL });
  const page = await context.newPage();
  try {
    await page.goto('/signup');
    await page.getByLabel('Your name', { exact: true }).fill('Calendar Reviewer');
    await page.getByLabel('Business name', { exact: true }).fill('Pacific Cafe');
    await page
      .getByLabel('Email address', { exact: true })
      .fill(`calendar-${Date.now()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('calendar-recovery-password-2026');
    await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
    await page.getByRole('button', { name: 'I saved my key. Open workspace.' }).click();
    await page.getByRole('button', { name: 'New recovery case', exact: true }).click();
    await page.getByLabel('Case name', { exact: true }).fill('Check the calendar date');
    await page.getByLabel('Supplier name', { exact: true }).fill('Pacific Supply');
    await page.getByLabel('Follow-up date', { exact: false }).fill('2026-09-30');
    await page.getByRole('button', { name: 'Create case', exact: true }).click();
    await expect(page.locator('.case-metadata')).toContainText('Follow up Sep 30');
  } finally {
    await context.close();
  }
});

test('narrow landing and dashboard keep the page inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Explore the sample demo' }).click();
  await expect(page.getByText('Identified discrepancies', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  const table = page.locator('.table-scroll');
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBeTruthy();
});

test('deliberately rerunning an existing analysis requests a fresh review', async ({ page }) => {
  await sample(page);
  await page.getByRole('link', { name: 'Review findings', exact: true }).click();
  const requested = page.waitForRequest(
    (request) => request.url().endsWith('/analyze') && request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Run sample again', exact: true }).click();
  expect((await requested).postDataJSON()).toEqual({ force: true });
  await expect(
    page.getByText('Analysis complete. Every finding is ready for inspection.'),
  ).toBeVisible();
  await expect(page.locator('.finding-card')).toHaveCount(2);
});
