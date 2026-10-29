// E02/US-003 · criterion 1: «Continuar con Google» takes the browser to /api/auth/google with the return url.
// («Conectando…» is checked in login.spec.ts: once the full-page navigation starts, the old page is gone for Playwright.)
import type { Route } from '@playwright/test';
import { expect, test } from '../fixtures/test';

test('«Continuar con Google» goes to /api/auth/google keeping where to return', async ({ page, api }) => {
  // The API would answer with a redirect to Google; here, a stand-in page.
  api.on('GET', '/auth/google', async (route: Route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google</p>' }));
  await page.goto('/login?return=/join/k3Jx9QmZ2vLpA8');

  await page.getByTestId('login-google').click();

  await expect(page).toHaveURL(/\/api\/auth\/google\?return=%2Fjoin%2Fk3Jx9QmZ2vLpA8$/);
  await expect(page.getByText('Google')).toBeVisible();
});
