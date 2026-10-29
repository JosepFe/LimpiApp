// E05/US-005 · criteria 1 and 3: #screen-stats default, loading, empty and error.
import type { Route } from '@playwright/test';
import { STATS } from '../fixtures/prototype-data';
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

const URL = '/households/h-casa/stats';
const cases: [string, string | undefined, unknown][] = [
  ['default', undefined, STATS],
  ['empty', 'empty', { ...STATS, completed: 0, minutes: 0, weeks: STATS.weeks.map((w) => ({ ...w, count: 0 })), share: [] }],
];

for (const [name, state, body] of cases) {
  test(`stats · ${name}`, async ({ page, api }) => {
    mockShell(api).on('GET', URL, body);
    await page.goto('/stats');
    await expectParity(page, { screen: 'stats', state });
  });
}

test('stats · loading', async ({ page, api }) => {
  mockShell(api).on('GET', URL, () => new Promise(() => undefined));
  await page.goto('/stats');
  await expectParity(page, { screen: 'stats', state: 'loading' });
});

test('stats · error', async ({ page, api }) => {
  mockShell(api).on('GET', URL, async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto('/stats');
  await expectParity(page, { screen: 'stats', state: 'error' });
});
