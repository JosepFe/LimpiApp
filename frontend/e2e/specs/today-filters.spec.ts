// E04/US-003 · criteria 1 and 2: «Mías», «Habitación» and «Tengo 15 min» filter Hoy; the URL keeps them.
import { TODAY_SUMMARY } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

const URL = '/households/h-casa/today';
const only = (...titles: string[]) => ({
  ...TODAY_SUMMARY,
  groups: Object.fromEntries(Object.entries(TODAY_SUMMARY.groups).map(([k, list]) => [k, (list as { title: string }[]).filter((t) => titles.includes(t.title))])),
});

test('«Mías», a room and «Tengo 15 min» ask the API with the filter, light up and stay in the URL', async ({ page, api }) => {
  mockShell(api)
    .on('GET', `${URL}?filter=mine`, only('Limpiar nevera por dentro', 'Fregar suelo', 'Limpiar fregadero', 'Barrer terraza'))
    .on('GET', `${URL}?filter=mine&room=r-bano`, only())
    .on('GET', `${URL}?room=r-bano`, only('Limpiar juntas y mamparas', 'Limpiar WC', 'Limpiar lavabo y espejo'))
    .on('GET', `${URL}?room=r-bano&max=15`, only('Limpiar WC', 'Limpiar lavabo y espejo'));
  await page.goto('/today');

  await page.getByTestId('filter-mine').click();
  await expect(page).toHaveURL(/\?f=mine$/);
  await expect(page.getByTestId('filter-mine')).toHaveClass(/active/);
  await expect(page.getByTestId('task-row')).toHaveCount(4);

  await page.getByLabel('Filtrar por habitación').selectOption({ label: '🛁 Baño' });
  await expect(page.getByTestId('filter-room')).toHaveText(/🛁 Baño/);
  await expect(page.getByTestId('today-no-results')).toBeVisible();

  await page.getByTestId('filter-all').click();
  await expect(page.getByTestId('task-row')).toHaveCount(3);
  await page.getByTestId('filter-time').click();
  await expect(page.getByTestId('filter-time')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('task-row')).toHaveText([/Limpiar WC/, /Limpiar lavabo y espejo/]);

  await page.reload();
  await expect(page.getByTestId('task-row')).toHaveCount(2);
  await expect(page.getByTestId('filter-room')).toHaveText(/🛁 Baño/);
});

test('«Quitar filtros» from no-results shows everything again', async ({ page, api }) => {
  mockShell(api).on('GET', `${URL}?filter=mine`, only());
  await page.goto('/today?f=mine');
  await page.getByRole('button', { name: 'Quitar filtros' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByTestId('task-row')).toHaveCount(11);
});
