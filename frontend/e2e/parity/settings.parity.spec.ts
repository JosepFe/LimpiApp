// E07/US-001 · criteria 1 and 4: #screen-settings default and error.
import type { Route } from '@playwright/test';
import { mockSettings } from '../fixtures/settings';
import { test } from '../fixtures/test';
import { expectParity } from './parity';

test('settings · default', async ({ page, api }) => {
  mockSettings(api);
  await page.goto('/settings');
  await expectParity(page, { screen: 'settings' });
});

test('settings · error', async ({ page, api }) => {
  mockSettings(api).on('PATCH', '/me', async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Color rose' }).click();
  await expectParity(page, { screen: 'settings', state: 'error' });
});
