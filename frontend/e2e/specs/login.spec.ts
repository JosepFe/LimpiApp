// E02/US-002 · criteria 2 and 3: sending the link («Enviando…» → «Revisa tu correo») and the error banner.
import type { Route } from '@playwright/test';
import { LOGIN_EMAIL } from '../fixtures/prototype-data';
import { expect, test } from '../fixtures/test';

test('sending the link shows «Enviando…» and then «Revisa tu correo»', async ({ page, api }) => {
  let release!: () => void;
  const sent = new Promise<void>((r) => (release = r));
  api.on('POST', '/auth/magic-link', async (route: Route) => {
    await sent;
    await route.fulfill({ status: 202, body: '' });
  });
  await page.goto('/login?return=/join/k3Jx9QmZ2vLpA8');
  await page.getByTestId('login-email').fill(LOGIN_EMAIL);
  await page.getByTestId('login-magic').click();
  await expect(page.getByText('Enviando…')).toBeVisible();
  release();

  await expect(page.getByTestId('login-link-sent')).toContainText(
    `Te hemos enviado un enlace de acceso a ${LOGIN_EMAIL}. Ábrelo desde este dispositivo.`,
  );
  expect(api.calls.find((c) => c.path === '/auth/magic-link')?.body).toEqual({ email: LOGIN_EMAIL, returnUrl: '/join/k3Jx9QmZ2vLpA8' });

  await page.getByTestId('login-resend').click();
  await expect(page.getByTestId('login-email')).toBeVisible();
});

test('?error=link and a failing API show «No hemos podido iniciar sesión.»', async ({ page, api }) => {
  await page.goto('/login?error=link');
  await expect(page.getByTestId('login-error')).toHaveText('No hemos podido iniciar sesión. Inténtalo de nuevo.');

  api.on('POST', '/auth/magic-link', async (route: Route) => route.fulfill({ status: 503, json: { title: 'x' } }));
  await page.goto('/login');
  await expect(page.getByTestId('login-error')).toHaveCount(0);
  await page.getByTestId('login-email').fill(LOGIN_EMAIL);
  await page.getByTestId('login-magic').click();
  await expect(page.getByTestId('login-error')).toBeVisible();
});
