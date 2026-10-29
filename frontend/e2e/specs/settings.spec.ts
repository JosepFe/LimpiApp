// E07/US-001 · criteria 2-4: changes save at once (PATCH /me, PATCH /households/{id}), the theme changes data-theme
// and survives a reload; members cannot edit the household; «Cerrar sesión» goes to the login.
import type { Route } from '@playwright/test';
import { HOUSEHOLD, ME } from '../fixtures/prototype-data';
import { mockSettings } from '../fixtures/settings';
import { expect, test } from '../fixtures/test';

test('name, colour and theme save at once and persist after a reload', async ({ page, api }) => {
  let me = { ...ME };
  mockSettings(api)
    .on('GET', '/auth/me', () => me)
    .on('PATCH', '/me', async (route: Route) => {
      me = { ...me, ...(route.request().postDataJSON() as object) };
      await route.fulfill({ json: me });
    });
  await page.goto('/settings');

  await page.getByTestId('settings-name').fill('Josep F.');
  await page.getByTestId('settings-name').press('Enter');
  await expect(page.locator('.card .avatar').first()).toHaveAttribute('title', 'Josep F.');
  await page.getByRole('button', { name: 'Color rose' }).click();
  await expect(page.locator('.card .avatar').first()).toHaveClass(/rose/);
  await page.getByTestId('settings-theme').getByRole('button', { name: 'Oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(api.calls.filter((c) => c.method === 'PATCH').map((c) => c.body)).toEqual([{ name: 'Josep F.' }, { avatarColor: 'rose' }, { theme: 'dark' }]);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('settings-name')).toHaveValue('Josep F.');
  await page.getByTestId('settings-theme').getByRole('button', { name: 'Claro' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
});

test('«Sistema» follows the device: dark when it prefers dark', async ({ page, api }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  mockSettings(api);
  await page.goto('/settings');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
});

test('a failed theme save goes back to the previous theme and shows the error', async ({ page, api }) => {
  mockSettings(api).on('PATCH', '/me', async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto('/settings');
  await page.getByTestId('settings-theme').getByRole('button', { name: 'Oscuro' }).click();
  await expect(page.getByRole('alert')).toHaveText('No se han podido guardar los ajustes.');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
});

test('the owner renames the household and changes its zone: the header shows the new name', async ({ page, api }) => {
  let name = 'Casa Pau y Josep';
  mockSettings(api)
    .on('GET', '/auth/me', () => ({ ...ME, households: [{ ...ME.households[0], name }, ME.households[1]] }))
    .on('PATCH', '/households/h-casa', async (route: Route) => {
      const body = route.request().postDataJSON() as { name?: string; timeZone?: string };
      name = body.name ?? name;
      await route.fulfill({ json: { id: 'h-casa', name, timeZone: body.timeZone ?? 'Europe/Madrid' } });
    });
  await page.goto('/settings');

  await page.getByTestId('settings-home-name').fill('Casa nueva');
  await page.getByTestId('settings-home-name').blur();
  await expect(page.getByTestId('side-home-switcher')).toContainText('Casa nueva');
  await page.getByTestId('settings-timezone').selectOption('Atlantic/Canary');
  await expect.poll(() => api.calls.filter((c) => c.method === 'PATCH').map((c) => c.body)).toEqual([{ name: 'Casa nueva' }, { timeZone: 'Atlantic/Canary' }]);
});

test('a member sees the household fields disabled', async ({ page, api }) => {
  mockSettings(api, { ...ME, households: [{ ...ME.households[0], role: 'member' }] }).on('GET', '/households/h-casa', { ...HOUSEHOLD, role: 'member' });
  await page.goto('/settings');
  await expect(page.getByTestId('settings-home-name')).toBeDisabled();
  await expect(page.getByTestId('settings-timezone')).toBeDisabled();
});

test('shortcuts: Productos, Miembros and «Cambiar de hogar»; «Cerrar sesión» goes to the login', async ({ page, api }) => {
  mockSettings(api)
    .on('GET', '/households/h-casa/members', [])
    .on('POST', '/auth/logout', async (route: Route) => route.fulfill({ status: 204, body: '' }));
  await page.goto('/settings');
  await page.getByTestId('settings-switch').click();
  await expect(page.getByTestId('sheet-home-switcher')).toBeVisible();
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('settings-members').click();
  await expect(page).toHaveURL(/\/members$/);
  await page.goBack();
  await page.getByTestId('settings-products').click();
  await expect(page).toHaveURL(/\/products$/);
  await page.goBack();

  await page.getByTestId('settings-logout').click();
  await expect(page).toHaveURL(/\/login$/);
});
