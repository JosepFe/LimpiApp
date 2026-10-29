// E02/US-002 · criteria 1 and 4: #screen-login in its four states.
import type { Route } from '@playwright/test';
import { LOGIN_EMAIL } from '../fixtures/prototype-data';
import { test } from '../fixtures/test';
import { expectParity } from './parity';

test('login · default', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(LOGIN_EMAIL);
  await expectParity(page, { screen: 'login' });
});

test('login · link-sent', async ({ page, api }) => {
  api.on('POST', '/auth/magic-link', async (route: Route) => route.fulfill({ status: 202, body: '' }));
  await page.goto('/login');
  await page.getByTestId('login-email').fill(LOGIN_EMAIL);
  await page.getByTestId('login-magic').click();
  await expectParity(page, { screen: 'login', state: 'link-sent' });
});

test('login · error', async ({ page }) => {
  await page.goto('/login?error=link');
  await page.getByTestId('login-email').fill(LOGIN_EMAIL);
  await expectParity(page, { screen: 'login', state: 'error' });
});

test('login · loading', async ({ page, api }) => {
  api.on('POST', '/auth/magic-link', () => new Promise(() => undefined)); // never answers: stays loading
  await page.goto('/login');
  await page.getByTestId('login-email').fill(LOGIN_EMAIL);
  await page.getByTestId('login-magic').click();
  await expectParity(page, { screen: 'login', state: 'loading' });
});
