// E03/US-008 · criteria 1, 2, 4 and 5: #screen-task-form new, validation-error, saving and edit.
import { FRIDGE_TASK } from '../fixtures/prototype-data';
import { fillLikeThePrototype, mockTaskForm } from '../fixtures/task-form';
import { test } from '../fixtures/test';
import { expectParity } from './parity';

const NEW = '/rooms/r-cocina?sheet=task-new&room=r-cocina';

test('task-form · new', async ({ page, api }) => {
  mockTaskForm(api);
  await page.goto(NEW);
  await fillLikeThePrototype(page);
  await expectParity(page, { screen: 'task-form', state: 'new' });
});

test('task-form · validation-error', async ({ page, api }) => {
  mockTaskForm(api);
  await page.goto(NEW);
  await fillLikeThePrototype(page);
  await page.getByTestId('task-save').click();
  await expectParity(page, { screen: 'task-form', state: 'validation-error' });
});

test('task-form · saving', async ({ page, api }) => {
  mockTaskForm(api).on('POST', '/households/h-casa/tasks', () => new Promise(() => undefined));
  await page.goto(NEW);
  await fillLikeThePrototype(page, 'Limpiar nevera por dentro');
  await page.getByTestId('task-save').click();
  await expectParity(page, { screen: 'task-form', state: 'saving' });
});

test('task-form · edit', async ({ page, api }) => {
  mockTaskForm(api).on('GET', '/households/h-casa/tasks/t-nevera', FRIDGE_TASK);
  await page.goto('/rooms/r-cocina?sheet=task-edit&task=t-nevera');
  await expectParity(page, { screen: 'task-form', state: 'edit' });
});
