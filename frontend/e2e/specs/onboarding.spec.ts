// E02/US-006 · criterion 2 and E02/US-007 · criteria 2 and 3: the name is required, the summary follows the cards,
// «Crear hogar» creates the household and opens Hoy.
import type { Route } from '@playwright/test';
import { ME, TEMPLATES, TODAY_SUMMARY } from '../fixtures/prototype-data';
import { expect, test } from '../fixtures/test';

test('without a name «Siguiente» does not advance and marks the field', async ({ page, api }) => {
  api.on('GET', '/auth/me', { ...ME, households: [] });
  await page.goto('/onboarding');
  await page.getByTestId('onboarding-next').click();
  await expect(page.getByTestId('onboarding-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('onboarding-next')).toBeVisible();
});

test('the summary follows the cards and «Crear hogar» creates the household and opens Hoy', async ({ page, api }) => {
  let me: object = { ...ME, households: [] };
  api.on('GET', '/auth/me', async (route: Route) => route.fulfill({ json: me })).on('GET', '/templates', TEMPLATES);
  api.on('POST', '/households', async (route: Route) => {
    me = { ...ME, households: [{ id: 'h-nueva', name: 'Casa Pau y Josep', role: 'owner', memberCount: 1 }] };
    await route.fulfill({ status: 201, json: { id: 'h-nueva', name: 'Casa Pau y Josep' } });
  });
  api.on('GET', '/households/h-nueva/today', TODAY_SUMMARY);

  await page.goto('/onboarding');
  await page.getByTestId('onboarding-name').fill('Casa Pau y Josep');
  await page.getByTestId('onboarding-timezone').selectOption('Atlantic/Canary');
  await page.getByTestId('onboarding-next').click();
  await expect(page.getByTestId('template-summary')).toHaveText('5 habitaciones · 24 tareas');

  await page.getByTestId('template-card').filter({ hasText: 'Terraza' }).click();
  await expect(page.getByTestId('template-summary')).toHaveText('4 habitaciones · 21 tareas');
  await page.getByTestId('template-card').filter({ hasText: 'Recibidor' }).click();
  await expect(page.getByTestId('template-card').filter({ hasText: 'Recibidor' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('template-summary')).toHaveText('5 habitaciones · 23 tareas');

  await page.getByText('Atrás').click();
  await expect(page.getByTestId('onboarding-name')).toHaveValue('Casa Pau y Josep');
  await page.getByTestId('onboarding-next').click();

  await page.getByTestId('onboarding-create').click();
  await expect(page).toHaveURL(/\/today$/);
  expect(api.calls.find((c) => c.method === 'POST' && c.path === '/households')?.body).toEqual({
    name: 'Casa Pau y Josep',
    timeZone: 'Atlantic/Canary',
    templates: ['kitchen', 'bathroom', 'bedroom', 'living', 'hall'],
  });
  await expect(page.getByTestId('side-home-switcher')).toContainText('Casa Pau y Josep');
});
