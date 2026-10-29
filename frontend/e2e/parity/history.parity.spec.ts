// E05/US-002 · criteria 1, 3 and 4: #screen-history default, loading, empty, error and no-results.
import type { Route } from '@playwright/test';
import { HISTORY } from '../fixtures/prototype-data';
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

const URL = '/households/h-casa/history';

test('history · default', async ({ page, api }) => {
  mockShell(api).on('GET', URL, HISTORY);
  await page.goto('/history');
  await expectParity(page, { screen: 'history' });
});

test('history · loading', async ({ page, api }) => {
  mockShell(api).on('GET', URL, () => new Promise(() => undefined));
  await page.goto('/history');
  await expectParity(page, { screen: 'history', state: 'loading' });
});

test('history · empty', async ({ page, api }) => {
  mockShell(api).on('GET', URL, { ...HISTORY, items: [], nextCursor: null });
  await page.goto('/history');
  await expectParity(page, { screen: 'history', state: 'empty' });
});

test('history · error', async ({ page, api }) => {
  mockShell(api).on('GET', URL, async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto('/history');
  await expectParity(page, { screen: 'history', state: 'error' });
});

test('history · no-results', async ({ page, api }) => {
  mockShell(api).on('GET', `${URL}?mine=true`, { ...HISTORY, items: [], nextCursor: null });
  await page.goto('/history?mine=1');
  await expectParity(page, { screen: 'history', state: 'no-results' });
});
