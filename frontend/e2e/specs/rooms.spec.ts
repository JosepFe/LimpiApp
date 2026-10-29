// E03/US-005 · criterion 3: a room card opens its detail: in the right pane on desktop, instead of the list on phones.
import { KITCHEN_TASKS, ROOMS } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

test.beforeEach(({ api }) => {
  api
    .on('GET', '/households/h-casa/rooms/r-cocina', ROOMS.rooms[0])
    .on('GET', '/households/h-casa/tasks?room=r-cocina', KITCHEN_TASKS)
    .on('GET', '/households/h-casa/rooms/r-bano', ROOMS.rooms[1])
    .on('GET', '/households/h-casa/tasks?room=r-bano', []);
});

test('desktop: the detail opens in the right pane, next to the list', async ({ page, api }) => {
  mockShell(api).on('GET', '/households/h-casa/rooms', ROOMS);
  await page.goto('/rooms');
  await page.getByTestId('room-card').filter({ hasText: 'Cocina' }).click();
  await expect(page).toHaveURL(/\/rooms\/r-cocina$/);
  await expect(page.locator('.pane-detail [data-screen="screen-room-detail"]')).toBeVisible();
  await expect(page.getByTestId('rooms-list')).toBeVisible();
});

test('phone: the detail replaces the list; Enter on a card opens it too', async ({ page, api }) => {
  mockShell(api).on('GET', '/households/h-casa/rooms', ROOMS);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/rooms');
  await page.getByTestId('room-card').filter({ hasText: 'Baño' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/rooms\/r-bano$/);
  await expect(page.locator('[data-screen="screen-room-detail"]')).toBeVisible();
  await expect(page.getByTestId('rooms-list')).toBeHidden();
});
