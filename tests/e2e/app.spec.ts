import { test, expect } from '@playwright/test';
test('React mounts and renders the styled login screen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aura', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 253, 240)');
  await page.screenshot({ path: test.info().outputPath('aura-login.png'), fullPage: true });
  expect(errors).toEqual([]);
});
