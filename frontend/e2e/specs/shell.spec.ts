// E01/US-006 · criteria 1 and 2: the sidebar on desktop and the bottom bar on phones, as in the prototype.
import { expect, mockShell, test } from '../fixtures/test';

const SECTIONS = ['today', 'rooms', 'activity', 'household', 'settings'];

test('desktop: the sidebar shows the active household and the five sections', async ({ page, api }) => {
  mockShell(api);
  await page.goto('/today');
  await expect(page.getByTestId('side-home-switcher')).toHaveText(/C\s*Casa Pau y Josep\s*3 miembros/);
  for (const s of SECTIONS) await expect(page.getByTestId(`nav-${s}`)).toBeVisible();
  await expect(page.getByTestId('nav-today')).toHaveText(/Hoy\s*6/);
  await expect(page.getByTestId('nav-rooms')).toHaveText('Habitaciones');
  await expect(page.getByTestId('bnav-today')).toBeHidden();
});

test('phone: the bottom bar navigates and highlights the active section', async ({ page, api }) => {
  mockShell(api);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/today');
  await expect(page.getByTestId('nav-today')).toBeHidden();
  for (const s of SECTIONS) await expect(page.getByTestId(`bnav-${s}`)).toBeVisible();
  await expect(page.getByTestId('bnav-today')).toHaveClass(/active/);

  await page.getByTestId('bnav-activity').click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByTestId('bnav-activity')).toHaveClass(/active/);
  await expect(page.getByTestId('bnav-today')).not.toHaveClass(/active/);
});

test('without a session the shell stays empty instead of breaking', async ({ page, api }) => {
  api.on('GET', '/auth/me', async (route: import('@playwright/test').Route) => {
    await route.fulfill({ status: 401, json: { title: 'Unauthorized' } });
  });
  await page.goto('/today');
  await expect(page.getByTestId('nav-today')).toHaveText('Hoy');
  await expect(page.getByTestId('side-home-switcher')).toHaveCount(0);
});
