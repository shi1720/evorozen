import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('settings export and password-confirmed account deletion work end to end', async ({ page }) => {
  const password = 'delete-only-this-workspace-2026';
  const email = `settings-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const registered = await page.request.post('/api/auth/register', { data: { name: 'Settings Reviewer', email, password, workspaceName: 'Export First Cafe', currency: 'USD' } });
  expect(registered.status()).toBe(201);
  const created = await page.request.post('/api/cases', { data: { title: 'One private case', supplierName: 'Meadow Foods' } });
  expect(created.status()).toBe(201);
  await page.goto('/app/settings');
  await expect(page.getByRole('heading', { name: 'Workspace settings', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Export workspace', exact: true })).toBeVisible();
  const exported = await page.request.get('/api/export');
  expect(exported.status()).toBe(200);
  expect((await exported.json()).cases).toHaveLength(1);

  await page.getByRole('button', { name: 'Delete account', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Export First Cafe');
  const destroy = dialog.getByRole('button', { name: 'Delete account permanently', exact: true });
  await expect(destroy).toBeDisabled();
  await dialog.getByLabel('Current password', { exact: true }).fill('incorrect-password');
  await dialog.getByRole('checkbox', { name: /I understand this permanently deletes/ }).check();
  await destroy.click();
  await expect(dialog.getByRole('alert')).toContainText('Password is incorrect.');
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);
  await dialog.getByRole('button', { name: 'Keep my account' }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole('button', { name: 'Delete account', exact: true }).click();
  await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  await dialog.getByLabel('Current password', { exact: true }).fill(password);
  await dialog.getByRole('checkbox').check();
  const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: 'output/screenshots/settings-delete-confirmation.png', fullPage: true });
  await destroy.click();
  await expect(page).toHaveURL('/');
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  expect((await page.request.post('/api/auth/login', { data: { email, password } })).status()).toBe(401);
});
