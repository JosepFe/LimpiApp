// E03/US-008 · criteria 3 and 4: at most 20 subtasks; saving goes back to the room's detail with the new task.
import type { Route } from '@playwright/test';
import { FRIDGE_TASK, KITCHEN_TASKS, taskRow } from '../fixtures/prototype-data';
import { fillLikeThePrototype, mockTaskForm } from '../fixtures/task-form';
import { expect, test } from '../fixtures/test';

test('with 20 subtasks «Añadir subtarea» is disabled', async ({ page, api }) => {
  mockTaskForm(api);
  await page.goto('/rooms/r-cocina?sheet=task-new&room=r-cocina');
  for (let i = 0; i < 20; i++) await page.getByTestId('task-add-subtask').click();
  await expect(page.getByText('20 de 20')).toBeVisible();
  await expect(page.getByTestId('task-add-subtask')).toBeDisabled();
});

test('«Guardar tarea» sends the task and the room detail shows it', async ({ page, api }) => {
  let tasks = KITCHEN_TASKS;
  mockTaskForm(api)
    .on('GET', '/households/h-casa/tasks?room=r-cocina', async (route: Route) => route.fulfill({ json: tasks }))
    .on('POST', '/households/h-casa/tasks', async (route: Route) => {
      tasks = [...KITCHEN_TASKS, taskRow('t-new', 'Limpiar campana', ['r-cocina', 'Cocina', '🍳'], ['z-horno', 'Horno'], 30, ['today', 'Hoy'], null)];
      await route.fulfill({ status: 201, json: { ...FRIDGE_TASK, id: 't-new' } });
    });
  await page.goto('/rooms/r-cocina?sheet=task-new&room=r-cocina');
  await fillLikeThePrototype(page, 'Limpiar campana');
  await page.getByTestId('task-zone').selectOption({ label: 'Horno' });
  await page.getByTestId('task-priority').getByText('Alta').click();
  await page.getByTestId('task-notes').fill('Con desengrasante.');
  await page.getByRole('button', { name: 'Quitar Bayetas microfibra' }).click();
  await page.getByTestId('task-save').click();

  await expect(page).toHaveURL(/\/rooms\/r-cocina$/);
  await expect(page.getByTestId('task-row').filter({ hasText: 'Limpiar campana' })).toBeVisible();
  // on desktop the rooms list next to the detail reloads too (its cards show health and the next task)
  expect(api.calls.filter((c) => c.path === '/households/h-casa/rooms').length).toBeGreaterThanOrEqual(2);
  expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({
    title: 'Limpiar campana', roomId: 'r-cocina', zoneId: 'z-horno', freqValue: 1, freqUnit: 'month', nextDue: '2026-10-14',
    estimatedMinutes: 30, priority: 'high', assigneeId: 'u-josep', notes: 'Con desengrasante.',
    subtasks: ['Vaciar y sacar baldas', 'Retirar lo caducado', 'Limpiar baldas y cajones'], productIds: ['p-desincrustante'],
  });
});

test('a rejected or failed save shows the banner and keeps what was typed', async ({ page, api }) => {
  let status = 400;
  mockTaskForm(api).on('POST', '/households/h-casa/tasks', async (route: Route) => route.fulfill({ status, json: { errors: {} } }));
  await page.goto('/rooms/r-cocina?sheet=task-new&room=r-cocina');
  await page.getByTestId('task-title').fill('Limpiar campana');
  await page.getByTestId('task-save').click();
  await expect(page.getByRole('alert')).toHaveText('Revisa los campos marcados.');
  status = 500;
  await page.getByTestId('task-save').click();
  await expect(page.getByRole('alert')).toHaveText('No se ha podido guardar. Inténtalo de nuevo.');
  await expect(page.getByTestId('task-title')).toHaveValue('Limpiar campana');
});
