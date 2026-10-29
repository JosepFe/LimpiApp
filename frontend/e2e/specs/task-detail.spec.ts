// E03/US-009 · criterion 4: «Editar» opens the task form; «Más acciones» archives the task.
import type { Route } from '@playwright/test';
import { FLOOR_TASK } from '../fixtures/prototype-data';
import { mockTaskForm } from '../fixtures/task-form';
import { expect, test } from '../fixtures/test';

test('«Editar tarea» opens the form with the task; «Más acciones» archives it after confirming', async ({ page, api }) => {
  mockTaskForm(api)
    .on('GET', '/households/h-casa/tasks/t-fregar', FLOOR_TASK)
    .on('DELETE', '/households/h-casa/tasks/t-fregar', async (route: Route) => route.fulfill({ status: 204, body: '' }));
  await page.goto('/tasks/t-fregar');
  await page.getByTestId('task-edit').click();
  await expect(page.getByTestId('task-title')).toHaveValue('Fregar suelo');
  await page.getByTestId('task-cancel').click();

  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Más acciones' }).click();
  await expect(page).toHaveURL(/\/rooms\/r-cocina$/);
  expect(api.calls.some((c) => c.method === 'DELETE')).toBe(true);
});
