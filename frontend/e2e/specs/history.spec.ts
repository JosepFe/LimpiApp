// E05/US-002 · criterion 2: «Cargar más» adds the next page; the filters ask the API and stay in the URL.
import { HISTORY, roomGuid } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

const URL = '/households/h-casa/history';
const older = { ...HISTORY, nextCursor: null, items: [{ ...HISTORY.items[5], id: 'h7', at: '2026-10-10T10:00:00Z', on: '2026-10-10', taskTitle: 'Limpiar horno' }] };

test('«Cargar más» adds the next page under a new day', async ({ page, api }) => {
  mockShell(api).on('GET', URL, HISTORY).on('GET', `${URL}?cursor=c1`, older);
  await page.goto('/history');
  await expect(page.getByTestId('history-row')).toHaveCount(6);
  await page.getByTestId('history-load-more').click();
  await expect(page.getByTestId('history-row')).toHaveCount(7);
  await expect(page.getByText('Sábado · sáb 10 oct')).toBeVisible();
  await expect(page.getByTestId('history-load-more')).toHaveCount(0);
});

test('«Solo yo» and a room filter the list; «Estadísticas» is the other tab', async ({ page, api }) => {
  const bano = roomGuid(1);
  mockShell(api)
    .on('GET', URL, HISTORY)
    .on('GET', `${URL}?mine=true`, { ...HISTORY, nextCursor: null, items: HISTORY.items.filter((i) => i.by.name === 'Josep') })
    .on('GET', `${URL}?mine=true&room=${bano}`, { ...HISTORY, nextCursor: null, items: [HISTORY.items[2]] });
  await page.goto('/history');
  await page.getByLabel('Quién').selectOption({ label: 'Solo yo' });
  await expect(page.getByTestId('history-row')).toHaveCount(2);
  await page.getByLabel('Filtrar por habitación').selectOption({ label: '🛁 Baño' });
  await expect(page).toHaveURL(new RegExp(`mine=1&room=${bano}$`));
  await expect(page.getByTestId('history-row')).toHaveText([/Josep limpió Baño: Limpiar ducha\/bañera/]);
  await expect(page.getByTestId('tab-stats')).toHaveAttribute('href', '/stats');
});
