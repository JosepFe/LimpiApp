// Mocks and helpers for the task form (#screen-task-form), opened over Cocina's detail.
import { expect, type Page } from '@playwright/test';
import { HOUSEHOLD, KITCHEN_TASKS, PRODUCTS, ROOMS } from './prototype-data';
import { mockShell, type MockApi } from './test';

export function mockTaskForm(api: MockApi): MockApi {
  return mockShell(api)
    .on('GET', '/households/h-casa', HOUSEHOLD)
    .on('GET', '/households/h-casa/rooms', ROOMS)
    .on('GET', '/households/h-casa/products', PRODUCTS)
    .on('GET', '/households/h-casa/rooms/r-cocina', ROOMS.rooms[0])
    .on('GET', '/households/h-casa/tasks?room=r-cocina', KITCHEN_TASKS);
}

/** Fills the form like the prototype draws it (title apart). */
export async function fillLikeThePrototype(page: Page, title = ''): Promise<void> {
  if (title) await page.getByTestId('task-title').fill(title);
  await page.getByTestId('task-freq-unit').selectOption({ label: 'meses' });
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Más' }).click(); // 15 → 30 min
  await page.getByTestId('task-assignee').selectOption({ label: 'Josep' });
  const subtasks = page.getByLabel('Subtarea', { exact: true });
  for (const [i, subtask] of ['Vaciar y sacar baldas', 'Retirar lo caducado', 'Limpiar baldas y cajones'].entries()) {
    await page.getByTestId('task-add-subtask').click();
    await expect(subtasks).toHaveCount(i + 1); // the new row is drawn after the click
    await subtasks.nth(i).fill(subtask);
  }
  await page.getByLabel('Añadir producto').selectOption({ label: '🧴 Desincrustante' });
  await page.getByLabel('Añadir producto').selectOption({ label: '🧽 Bayetas microfibra' });
}
