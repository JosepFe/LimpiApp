// E05/US-003 · criteria 1-3: #screen-history-entry default, with-photos and undone.
import type { Route } from '@playwright/test';
import { HISTORY, SHOWER_ENTRY, SHOWER_ENTRY_PHOTOS, SHOWER_ENTRY_UNDONE } from '../fixtures/prototype-data';
import { photos } from '../fixtures/photos';
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

const cases: [string, string | undefined, unknown][] = [
  ['default', undefined, SHOWER_ENTRY],
  ['with-photos', 'with-photos', SHOWER_ENTRY_PHOTOS],
  ['undone', 'undone', SHOWER_ENTRY_UNDONE],
];

for (const [name, state, entry] of cases) {
  test(`history-entry · ${name}`, async ({ page, api }) => {
    mockShell(api).on('GET', '/households/h-casa/history', HISTORY).on('GET', '/households/h-casa/history/h3', entry);
    for (const id of ['p1', 'p2', 'p3']) {
      api.on('GET', `/households/h-casa/photos/${id}`, async (route: Route) => route.fulfill({ contentType: 'image/png', body: photos(1)[0].buffer }));
    }
    await page.goto('/history?sheet=history-entry&entry=h3');
    await expectParity(page, { screen: 'history-entry', state });
  });
}
