// E02/US-008 · criteria 1, 2 and 4: open «Mis hogares» from the sidebar, change household (remembered) and create one.
import type { Route } from '@playwright/test';
import { ME, ROOMS, TODAY_SUMMARY } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

test('the sidebar opens «Mis hogares»; choosing another household opens its Hoy and is remembered', async ({ page, api }) => {
  mockShell(api).on('GET', '/households/h-playa/today', { summary: { pendingToday: 2 } }).on('GET', '/households/h-casa/rooms', ROOMS);
  await page.goto('/rooms');
  await page.getByTestId('side-home-switcher').click();
  await expect(page).toHaveURL(/\/rooms\?sheet=homes$/);
  await expect(page.getByTestId('home-row')).toHaveText([/Casa Pau y Josep\s*3 miembros · Propietario/, /Casa de la playa\s*2 miembros · Miembro/]);

  await page.getByTestId('home-row').filter({ hasText: 'Casa de la playa' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByTestId('side-home-switcher')).toContainText('Casa de la playa');
  await expect(page.getByTestId('nav-today')).toHaveText(/Hoy\s*2/);

  await page.reload();
  await expect(page.getByTestId('side-home-switcher')).toContainText('Casa de la playa');
});

test('the sheet closes with its button and with Escape', async ({ page, api }) => {
  mockShell(api);
  await page.goto('/today?sheet=homes');
  await page.getByTestId('sheet-close').click();
  await expect(page.getByTestId('sheet-home-switcher')).toHaveCount(0);
  await expect(page).toHaveURL(/\/today$/);
  await page.goto('/today?sheet=homes');
  await expect(page.getByTestId('sheet-home-switcher')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('sheet-home-switcher')).toHaveCount(0);
});

test('«Crear otro hogar» with a name creates it without templates and makes it the active one', async ({ page, api }) => {
  let me: object = ME;
  mockShell(api);
  api.on('GET', '/auth/me', async (route: Route) => route.fulfill({ json: me }));
  api.on('POST', '/households', async (route: Route) => {
    me = { ...ME, households: [...ME.households, { id: 'h-pueblo', name: 'Casa del pueblo', role: 'owner', memberCount: 1 }] };
    await route.fulfill({ status: 201, json: { id: 'h-pueblo' } });
  });
  api.on('GET', '/households/h-pueblo/today', TODAY_SUMMARY);

  await page.goto('/today?sheet=homes');
  await page.getByTestId('home-create').click();
  await page.getByTestId('home-name').fill('Casa del pueblo');
  await page.getByTestId('home-create-submit').click();

  await expect(page.getByTestId('side-home-switcher')).toContainText('Casa del pueblo');
  expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({ name: 'Casa del pueblo', templates: [] });
});
