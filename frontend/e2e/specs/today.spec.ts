// E04/US-002 · criterion 3: a row opens the task detail (pane on desktop); «Nueva tarea» opens the form.
import { FLOOR_TASK } from '../fixtures/prototype-data';
import { mockTaskForm } from '../fixtures/task-form';
import { expect, test } from '../fixtures/test';

test('a row opens its detail in the Hoy pane; /tasks/:id leads there; «Nueva tarea» opens the form', async ({ page, api }) => {
  mockTaskForm(api).on('GET', '/households/h-casa/tasks/t-fregar', FLOOR_TASK);
  await page.goto('/today');
  await page.getByTestId('task-row').filter({ hasText: 'Fregar suelo' }).click();
  await expect(page).toHaveURL(/\/today\/tasks\/t-fregar$/);
  await expect(page.locator('.pane-detail [data-testid="task-detail-body"]')).toBeVisible();
  await expect(page.getByTestId('today-groups')).toBeVisible();
  await expect(page.getByTestId('nav-today')).toHaveClass(/active/);

  await page.goto('/tasks/t-fregar');
  await expect(page).toHaveURL(/\/today\/tasks\/t-fregar$/);

  await page.goto('/today');
  await page.getByTestId('new-task-desktop').click();
  await expect(page.getByTestId('sheet-task-form')).toBeVisible();
});

test('phone: the detail replaces the list; the household name opens «Mis hogares»', async ({ page, api }) => {
  mockTaskForm(api).on('GET', '/households/h-casa/tasks/t-fregar', FLOOR_TASK);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/today');
  await page.getByTestId('home-switch').click();
  await expect(page.getByTestId('sheet-home-switcher')).toBeVisible();
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('task-row').filter({ hasText: 'Fregar suelo' }).click();
  await expect(page.getByTestId('task-detail-body')).toBeVisible();
  await expect(page.getByTestId('today-groups')).toBeHidden();
});
