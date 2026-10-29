// E03/US-009 · criteria 1-4: #screen-task-detail in its five states. Compared by its body (task-detail-body):
// on desktop the prototype shows it inside the Hoy pane, not as its own section.
import type { Route } from '@playwright/test';
import { FLOOR_TASK, MICROWAVE_TASK, OVEN_TASK } from '../fixtures/prototype-data';
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

const cases: [string, string | undefined, string, unknown][] = [
  ['default', undefined, 't-fregar', FLOOR_TASK],
  ['overdue', 'overdue', 't-horno', OVEN_TASK],
  ['never-done', 'never-done', 't-micro', MICROWAVE_TASK],
];

for (const [name, state, id, task] of cases) {
  test(`task-detail · ${name}`, async ({ page, api }) => {
    mockShell(api).on('GET', `/households/h-casa/tasks/${id}`, task);
    await page.goto(`/tasks/${id}`);
    await expectParity(page, { screen: 'task-detail', state, scope: 'task-detail-body' });
  });
}

test('task-detail · loading', async ({ page, api }) => {
  mockShell(api).on('GET', '/households/h-casa/tasks/t-fregar', () => new Promise(() => undefined));
  await page.goto('/tasks/t-fregar');
  await expectParity(page, { screen: 'task-detail', state: 'loading', scope: 'task-detail-body' });
});

test('task-detail · error', async ({ page, api }) => {
  mockShell(api).on('GET', '/households/h-casa/tasks/t-fregar', async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto('/tasks/t-fregar');
  await expectParity(page, { screen: 'task-detail', state: 'error', scope: 'task-detail-body' });
});
