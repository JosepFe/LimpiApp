// E04/US-002 · criteria 1, 2 and 4: #screen-today default, loading, empty and error; E04/US-003 · criterion 3: no-results.
import type { Route } from '@playwright/test';
import { TODAY_SUMMARY } from '../fixtures/prototype-data';
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

const URL = '/households/h-casa/today';

test('today · default', async ({ page, api }) => {
  mockShell(api);
  await page.goto('/today');
  await expectParity(page, { screen: 'today' });
});

test('today · loading', async ({ page, api }) => {
  mockShell(api).on('GET', URL, () => new Promise(() => undefined));
  await page.goto('/today');
  await expectParity(page, { screen: 'today', state: 'loading' });
});

test('today · empty', async ({ page, api }) => {
  mockShell(api).on('GET', URL, { ...TODAY_SUMMARY, summary: { ...TODAY_SUMMARY.summary, pendingToday: 0 }, groups: { overdue: [], today: [], upcoming: [] } });
  await page.goto('/today');
  await expectParity(page, { screen: 'today', state: 'empty' });
});

test('today · error', async ({ page, api }) => {
  mockShell(api).on('GET', URL, async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto('/today');
  await expectParity(page, { screen: 'today', state: 'error' });
});

test('today · no-results', async ({ page, api }) => {
  mockShell(api).on('GET', `${URL}?max=15`, { ...TODAY_SUMMARY, groups: { overdue: [], today: [], upcoming: [] } });
  await page.goto('/today?max=15');
  await expectParity(page, { screen: 'today', state: 'no-results' });
});
