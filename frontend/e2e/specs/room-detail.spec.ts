// E03/US-007 · criterion 2: «Añadir tarea» opens the task form with the room chosen; a task opens its detail.
import { KITCHEN_TASKS, ROOMS } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

test('«Añadir tarea» asks for the task form of this room; a row opens the task; the pencil edits the room', async ({ page, api }) => {
  mockShell(api)
    .on('GET', '/households/h-casa/rooms', ROOMS)
    .on('GET', '/households/h-casa/rooms/r-cocina', ROOMS.rooms[0])
    .on('GET', '/households/h-casa/tasks?room=r-cocina', KITCHEN_TASKS);
  await page.goto('/rooms/r-cocina');

  await page.getByTestId('add-task-desktop').click();
  await expect(page).toHaveURL(/\/rooms\/r-cocina\?sheet=task-new&room=r-cocina$/);

  await page.goto('/rooms/r-cocina');
  await page.getByTestId('room-edit').click();
  await expect(page).toHaveURL(/sheet=room-edit&room=r-cocina/);
  await expect(page.getByTestId('room-name')).toHaveValue('Cocina');

  await page.goto('/rooms/r-cocina');
  await page.getByTestId('task-row').filter({ hasText: 'Fregar suelo' }).click();
  await expect(page).toHaveURL(/\/tasks\/t-fregar$/);
});
