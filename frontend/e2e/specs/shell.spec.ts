// E01/US-006 · criteria 1 and 2: the sidebar on desktop and the bottom bar on phones, as in the prototype.
import { HISTORY } from '../fixtures/prototype-data';
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
  mockShell(api).on('GET', '/households/h-casa/history', HISTORY);
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
