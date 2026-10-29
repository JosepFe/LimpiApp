// E04/US-007 · criterion 1: «Deshacer» (in the sheet, or in the «Tarea completada» toast after «Listo») puts the task back.
import type { Route } from '@playwright/test';
import { COMPLETE_RESULT, COMPLETE_TASK, TODAY_SUMMARY } from '../fixtures/prototype-data';
import { expect, mockShell, test, type MockApi } from '../fixtures/test';

function mockDoneAndUndone(api: MockApi, undo: (route: Route) => unknown) {
  let done = false;
  const without = { ...TODAY_SUMMARY, groups: { ...TODAY_SUMMARY.groups, overdue: (TODAY_SUMMARY.groups.overdue as { id: string }[]).filter((t) => t.id !== 't-nevera') } };
  mockShell(api)
    .on('GET', '/households/h-casa/today', async (route: Route) => route.fulfill({ json: done ? without : TODAY_SUMMARY }))
    .on('GET', '/households/h-casa/tasks/t-nevera', COMPLETE_TASK)
    .on('POST', '/households/h-casa/tasks/t-nevera/complete', async (route: Route) => {
      done = true;
      await route.fulfill({ status: 201, json: COMPLETE_RESULT });
    })
    .on('POST', '/households/h-casa/completions/c-nevera/undo', async (route: Route) => {
      done = false;
      await undo(route);
    });
}
const fridge = (page: import('@playwright/test').Page) => page.getByTestId('task-row').filter({ hasText: 'Limpiar nevera por dentro' });

test('«Deshacer» in the sheet: the task goes back to Atrasadas', async ({ page, api }) => {
  mockDoneAndUndone(api, (route) => route.fulfill({ status: 204, body: '' }));
  await page.goto('/today?sheet=complete&task=t-nevera');
  await page.getByTestId('complete-confirm').click();
  await expect(fridge(page)).toHaveCount(0);
  await page.getByTestId('complete-undo').click();
  await expect(page.getByTestId('sheet-complete')).toHaveCount(0);
  await expect(fridge(page)).toHaveCount(1);
});

test('after «Listo», the toast «Tarea completada · Deshacer» undoes it', async ({ page, api }) => {
  mockDoneAndUndone(api, (route) => route.fulfill({ status: 204, body: '' }));
  await page.goto('/today?sheet=complete&task=t-nevera');
  await page.getByTestId('complete-confirm').click();
  await page.getByTestId('complete-done').click();
  const toast = page.getByRole('status');
  await expect(toast).toHaveText('Tarea completadaDeshacer');
  await toast.getByRole('button', { name: 'Deshacer' }).click();
  await expect(fridge(page)).toHaveCount(1);
  await expect(toast).toHaveCount(0);
});

test('when the API says it is too late, the toast says so', async ({ page, api }) => {
  mockDoneAndUndone(api, (route) => route.fulfill({ status: 409, json: { title: 'Ya no se puede deshacer.' } }));
  await page.goto('/today?sheet=complete&task=t-nevera');
  await page.getByTestId('complete-confirm').click();
  await page.getByTestId('complete-undo').click();
  await expect(page.getByRole('status')).toHaveText('Ya no se puede deshacer.');
});
