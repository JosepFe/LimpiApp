// E03/US-007 · criteria 1, 3 and 4: #screen-room-detail (Cocina) in its four states. Compared by its body
// (room-detail-body): on desktop the prototype shows it inside the rooms pane, not as its own section.
import type { Route } from '@playwright/test';
import { KITCHEN_TASKS, ROOMS } from '../fixtures/prototype-data';
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

const ROOM = '/households/h-casa/rooms/r-cocina';
const TASKS = '/households/h-casa/tasks?room=r-cocina';

test.beforeEach(({ api }) => {
  mockShell(api).on('GET', '/households/h-casa/rooms', ROOMS).on('GET', ROOM, ROOMS.rooms[0]);
});

test('room-detail · default', async ({ page, api }) => {
  api.on('GET', TASKS, KITCHEN_TASKS);
  await page.goto('/rooms/r-cocina');
  await expectParity(page, { screen: 'room-detail', scope: 'room-detail-body' });
});

test('room-detail · empty', async ({ page, api }) => {
  api.on('GET', TASKS, []);
  await page.goto('/rooms/r-cocina');
  await expectParity(page, { screen: 'room-detail', state: 'empty', scope: 'room-detail-body' });
});

test('room-detail · loading', async ({ page, api }) => {
  api.on('GET', TASKS, () => new Promise(() => undefined));
  await page.goto('/rooms/r-cocina');
  await expectParity(page, { screen: 'room-detail', state: 'loading', scope: 'room-detail-body' });
});

test('room-detail · error', async ({ page, api }) => {
  api.on('GET', TASKS, async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto('/rooms/r-cocina');
  await expectParity(page, { screen: 'room-detail', state: 'error', scope: 'room-detail-body' });
});
