// E03/US-007 · criterion 2: «Añadir tarea» opens the task form with the room chosen; a task opens its detail.
import { mockTaskForm } from '../fixtures/task-form';
import { expect, test } from '../fixtures/test';

test('«Añadir tarea» asks for the task form of this room; a row opens the task; the pencil edits the room', async ({ page, api }) => {
  mockTaskForm(api);
  await page.goto('/rooms/r-cocina');

  await page.getByTestId('add-task-desktop').click();
  await expect(page).toHaveURL(/\/rooms\/r-cocina\?sheet=task-new&room=r-cocina$/);
  await expect(page.getByTestId('task-room')).toHaveValue('r-cocina');

  await page.goto('/rooms/r-cocina');
  await page.getByTestId('room-edit').click();
  await expect(page).toHaveURL(/sheet=room-edit&room=r-cocina/);
  await expect(page.getByTestId('room-name')).toHaveValue('Cocina');

  await page.goto('/rooms/r-cocina');
  await page.getByTestId('task-row').filter({ hasText: 'Fregar suelo' }).click();
  await expect(page).toHaveURL(/\/tasks\/t-fregar$/);
});
