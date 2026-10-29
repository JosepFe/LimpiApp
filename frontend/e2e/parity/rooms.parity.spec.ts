// E03/US-005 · criteria 1, 2 and 4: #screen-rooms in its four states.
import type { Route } from '@playwright/test';
import { ROOMS } from '../fixtures/prototype-data';
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

const URL = '/households/h-casa/rooms';

test('rooms · default', async ({ page, api }) => {
  mockShell(api).on('GET', URL, ROOMS);
  await page.goto('/rooms');
  await expectParity(page, { screen: 'rooms' });
});

test('rooms · loading', async ({ page, api }) => {
  mockShell(api).on('GET', URL, () => new Promise(() => undefined));
  await page.goto('/rooms');
  await expectParity(page, { screen: 'rooms', state: 'loading' });
});

test('rooms · empty', async ({ page, api }) => {
  mockShell(api).on('GET', URL, { summary: { health: null, roomCount: 0, overdueCount: 0 }, rooms: [] });
  await page.goto('/rooms');
  await expectParity(page, { screen: 'rooms', state: 'empty' });
});

test('rooms · error', async ({ page, api }) => {
  mockShell(api).on('GET', URL, async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto('/rooms');
  await expectParity(page, { screen: 'rooms', state: 'error' });
});
