// E04/US-005 · criterion 3: confirming sends what was done, shows «¡Hecho!» and the task leaves Atrasadas.
import type { Route } from '@playwright/test';
import { COMPLETE_RESULT, COMPLETE_TASK, TODAY_SUMMARY } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

test('the check of a Hoy row opens the sheet; «Confirmar» completes it and Hoy reloads without it', async ({ page, api }) => {
  let today: object = TODAY_SUMMARY;
  mockShell(api)
    .on('GET', '/households/h-casa/today', async (route: Route) => route.fulfill({ json: today }))
    .on('GET', '/households/h-casa/tasks/t-nevera', COMPLETE_TASK)
    .on('POST', '/households/h-casa/tasks/t-nevera/complete', async (route: Route) => {
      today = {
        ...TODAY_SUMMARY,
        summary: { ...TODAY_SUMMARY.summary, pendingToday: 5, streak: 6 },
        groups: { ...TODAY_SUMMARY.groups, overdue: (TODAY_SUMMARY.groups.overdue as { id: string }[]).filter((t) => t.id !== 't-nevera') },
      };
      await route.fulfill({ status: 201, json: { ...COMPLETE_RESULT, nextDueDay: 'sáb 14 nov' } });
    });
  await page.goto('/today');
  await page.getByRole('button', { name: 'Marcar hecha: Limpiar nevera por dentro', exact: true }).click();
  await expect(page.getByTestId('sheet-complete')).toBeVisible();

  await page.getByTestId('complete-check').nth(4).click();
  await expect(page.getByTestId('complete-points')).toHaveText('+7 pts'); // 4 of 5: round(9 × 4 / 5)
  await page.getByRole('button', { name: 'Menos' }).click();
  await page.getByTestId('complete-note').fill('Sin hielo');
  await page.getByTestId('complete-confirm').click();

  await expect(page.getByTestId('complete-success')).toContainText('¡Hecho!');
  await expect(page.getByTestId('complete-success')).toContainText('Próxima vez: sáb 14 nov');
  expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({ subtasksDone: 4, minutes: 25, note: 'Sin hielo' });
  await expect(page.getByTestId('task-row').filter({ hasText: 'Limpiar nevera por dentro' })).toHaveCount(0);
  await expect(page.getByTestId('nav-today')).toHaveText(/Hoy\s*5/);

  await page.getByTestId('complete-done').click();
  await expect(page.getByTestId('sheet-complete')).toHaveCount(0);
  await expect(page.getByTestId('home-streak')).toHaveText('🔥 Racha de 6 días');
});
