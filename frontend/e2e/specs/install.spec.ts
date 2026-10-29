// E07/US-002 · criterion 2: «Instalar» calls prompt() and, once accepted, the banner goes.
import { offerInstall } from '../fixtures/install';
import { mockSettings } from '../fixtures/settings';
import { expect, test } from '../fixtures/test';

test('«Instalar» opens the browser prompt; accepted, the banner goes', async ({ page, api }) => {
  mockSettings(api);
  await page.goto('/today');
  await offerInstall(page); // before Ajustes opens: it is kept until then
  await page.getByTestId('nav-settings').or(page.getByTestId('bnav-settings')).first().click();

  await page.getByTestId('install-btn').click();

  await expect(page.getByTestId('install-banner')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { prompted: number }).prompted)).toBe(1);
});

test('dismissed, the banner also goes until the browser offers it again', async ({ page, api }) => {
  mockSettings(api);
  await page.goto('/settings');
  await offerInstall(page, 'dismissed');
  await page.getByTestId('install-btn').click();
  await expect(page.getByTestId('install-banner')).toHaveCount(0);

  await offerInstall(page);
  await expect(page.getByTestId('install-banner')).toBeVisible();
});

test('without the browser event there is no banner; once installed it goes', async ({ page, api }) => {
  mockSettings(api);
  await page.goto('/settings');
  await expect(page.getByTestId('settings-version')).toBeVisible();
  await expect(page.getByTestId('install-banner')).toHaveCount(0);

  await offerInstall(page);
  await expect(page.getByTestId('install-banner')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(page.getByTestId('install-banner')).toHaveCount(0);
});
