// E05/US-003 · criteria 1 and 2: a row opens «Detalle de actividad»; its photos load with the session; «Cerrar» closes it.
import type { Route } from '@playwright/test';
import { HISTORY, SHOWER_ENTRY_PHOTOS } from '../fixtures/prototype-data';
import { photos } from '../fixtures/photos';
import { expect, mockShell, test } from '../fixtures/test';

test('a history row opens its detail with the photos; «Cerrar» goes back to the list', async ({ page, api }) => {
  let photoRequests = 0;
  mockShell(api).on('GET', '/households/h-casa/history', HISTORY).on('GET', '/households/h-casa/history/h3', SHOWER_ENTRY_PHOTOS);
  for (const id of ['p1', 'p2', 'p3']) {
    api.on('GET', `/households/h-casa/photos/${id}`, async (route: Route) => {
      photoRequests++;
      await route.fulfill({ contentType: 'image/png', body: photos(1)[0].buffer });
    });
  }
  await page.goto('/history');
  await page.getByTestId('history-row').filter({ hasText: 'Limpiar ducha/bañera' }).click();
  await expect(page).toHaveURL(/sheet=history-entry&entry=h3/);
  await expect(page.getByTestId('sheet-history-entry')).toContainText('mar 13 oct · 19:42');
  await expect(page.getByTestId('entry-photos').getByRole('img', { name: 'Foto' })).toHaveCount(3);
  await expect.poll(() => photoRequests).toBe(3);

  await page.getByTestId('entry-close').click();
  await expect(page.getByTestId('sheet-history-entry')).toHaveCount(0);
  await expect(page).toHaveURL(/\/history$/);
});
