// E06/US-002 · criterion 2: «Salir» leaves the household (to another one or the onboarding); owners remove someone.
import type { Route } from '@playwright/test';
import { MEMBERS, ME, TODAY_SUMMARY } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

const URL = '/households/h-casa/members';
const noContent = async (route: Route) => route.fulfill({ status: 204, body: '' });

test('«Salir», once confirmed, leaves the household and goes to Hoy of the other one', async ({ page, api }) => {
  let left = false;
  api
    .on('GET', '/auth/me', () => (left ? { ...ME, households: ME.households.slice(1) } : ME))
    .on('GET', '/households/h-casa/today', TODAY_SUMMARY)
    .on('GET', '/households/h-playa/today', TODAY_SUMMARY)
    .on('GET', URL, MEMBERS)
    .on('DELETE', `${URL}/u-josep`, async (route: Route) => {
      left = true;
      await noContent(route);
    });
  await page.goto('/members');

  page.once('dialog', (dialog) => {
    expect(dialog.message()).toBe('¿Salir de Casa Pau y Josep? Tus tareas quedarán sin asignar.');
    void dialog.accept();
  });
  await page.getByTestId('leave-home').click();

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('status')).toContainText('Has salido del hogar');
  await expect(page.getByTestId('home-switch').first()).toContainText('Casa de la playa');
});

test('leaving the only household goes to the onboarding; cancelling the dialog does nothing', async ({ page, api }) => {
  let left = false;
  const alone = { ...ME, households: ME.households.slice(0, 1) };
  api
    .on('GET', '/auth/me', () => (left ? { ...ME, households: [] } : alone))
    .on('GET', '/households/h-casa/today', TODAY_SUMMARY)
    .on('GET', URL, MEMBERS)
    .on('DELETE', `${URL}/u-josep`, async (route: Route) => {
      left = true;
      await noContent(route);
    });
  await page.goto('/members');

  page.once('dialog', (dialog) => void dialog.dismiss());
  await page.getByTestId('leave-home').click();
  await expect(page.getByTestId('member-row')).toHaveCount(3);
  expect(api.calls.some((c) => c.method === 'DELETE')).toBe(false);

  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByTestId('leave-home').click();
  await expect(page).toHaveURL(/\/onboarding$/);
});

test('the last owner cannot leave: the API message is shown and nothing changes', async ({ page, api }) => {
  mockShell(api)
    .on('GET', URL, MEMBERS)
    .on('DELETE', `${URL}/u-josep`, async (route: Route) =>
      route.fulfill({ status: 409, json: { status: 409, detail: 'Eres el único propietario: no puedes salir mientras haya otros miembros.' } }));
  await page.goto('/members');

  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByTestId('leave-home').click();

  await expect(page.getByRole('status')).toContainText('Eres el único propietario');
  await expect(page).toHaveURL(/\/members$/);
});

test('an owner removes Marta from «Acciones de Marta»', async ({ page, api }) => {
  mockShell(api).on('GET', URL, MEMBERS).on('DELETE', `${URL}/u-marta`, noContent);
  await page.goto('/members');

  page.once('dialog', (dialog) => {
    expect(dialog.message()).toBe('¿Quitar a Marta del hogar? Sus tareas quedarán sin asignar.');
    void dialog.accept();
  });
  await page.getByRole('button', { name: 'Acciones de Marta' }).click();

  await expect(page.getByTestId('member-row')).toHaveCount(2);
  await expect(page.getByRole('status')).toContainText('Marta ya no está en el hogar');
});

test('a member sees no «Invitar» and no actions on the others', async ({ page, api }) => {
  const member = { ...ME, households: [{ ...ME.households[0], role: 'member' }] };
  mockShell(api, member).on('GET', URL, MEMBERS);
  await page.goto('/members');

  await expect(page.getByTestId('member-row')).toHaveCount(3);
  await expect(page.getByTestId('invite-open')).toHaveCount(0);
  await expect(page.getByTestId('member-actions')).toHaveCount(0);
  await expect(page.getByTestId('leave-home')).toHaveCount(1);
});
