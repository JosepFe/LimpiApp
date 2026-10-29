// E06/US-006 · criteria 1 and 4: #screen-ranking default, loading, empty and error.
import type { Route } from '@playwright/test';
import { RANKING } from '../fixtures/prototype-data';
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

const URL = '/households/h-casa/ranking?period=week';

test('ranking · default', async ({ page, api }) => {
  mockShell(api).on('GET', URL, RANKING.week);
  await page.goto('/ranking');
  await expectParity(page, { screen: 'ranking' });
});

test('ranking · loading', async ({ page, api }) => {
  mockShell(api).on('GET', URL, () => new Promise(() => undefined));
  await page.goto('/ranking');
  await expectParity(page, { screen: 'ranking', state: 'loading' });
});

test('ranking · empty', async ({ page, api }) => {
  mockShell(api).on('GET', URL, { ...RANKING.week, householdStreak: 0, hasPoints: false, rows: RANKING.week.rows.map((r) => ({ ...r, points: 0, tasks: 0, streak: 0 })) });
  await page.goto('/ranking');
  await expectParity(page, { screen: 'ranking', state: 'empty' });
});

test('ranking · error', async ({ page, api }) => {
  mockShell(api).on('GET', URL, async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto('/ranking');
  await expectParity(page, { screen: 'ranking', state: 'error' });
});
