// E02/US-004 · criterion 2: without a session a private screen goes to the login, which keeps where to come back.
import type { Route } from '@playwright/test';
import { ME } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

test('without a session /rooms goes to /login?return=/rooms and the link brings the user back there', async ({ page, api }) => {
  api.on('GET', '/auth/me', async (route: Route) => route.fulfill({ status: 401, json: { title: 'Unauthorized' } }));
  api.on('POST', '/auth/magic-link', async (route: Route) => route.fulfill({ status: 202, body: '' }));

  await page.goto('/rooms');
  await expect(page).toHaveURL(/\/login\?return=%2Frooms$/);
  await page.getByTestId('login-email').fill('josep@example.com');
  await page.getByTestId('login-magic').click();
  await expect(page.getByTestId('login-link-sent')).toBeVisible();
  // The API redirects the redeemed link to this return url (MagicLinkTests); then the guard lets the user in.
  expect(api.calls.find((c) => c.path === '/auth/magic-link')?.body).toEqual({ email: 'josep@example.com', returnUrl: '/rooms' });

  mockShell(api);
  await page.goto('/rooms');
  await expect(page).toHaveURL(/\/rooms$/);
  await expect(page.getByTestId('nav-rooms')).toHaveClass(/active/);
});

test('a signed-in user without households goes to the onboarding', async ({ page, api }) => {
  api.on('GET', '/auth/me', { ...ME, households: [] });
  await page.goto('/today');
  await expect(page).toHaveURL(/\/onboarding$/);
});

test('API requests carry the CSRF header', async ({ page, api }) => {
  mockShell(api);
  const request = page.waitForRequest('**/api/auth/me');
  await page.goto('/today');
  expect((await request).headers()['x-requested-with']).toBe('limpiapp');
});
