// E06/US-006 · criterion 2: «Mes» and «Total» change the podium and the rows.
import type { Route } from '@playwright/test';
import { RANKING } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

const url = (period: string) => `/households/h-casa/ranking?period=${period}`;

test('«Mes» and «Total» change the podium and the rows; «Semana» goes back', async ({ page, api }) => {
  mockShell(api).on('GET', url('week'), RANKING.week).on('GET', url('month'), RANKING.month).on('GET', url('all'), RANKING.all);
  await page.goto('/ranking');
  const first = page.getByTestId('ranking-row').first();
  await expect(first).toHaveText(/1\s*J\s*Josep\s*tú\s*9 tareas · 🔥 5\s*46\s*pts/);

  await page.getByTestId('period-month').click();
  await expect(first).toContainText('182');
  await expect(page.locator('.pod.p1')).toContainText('Josep182 pts');
  await expect(page.getByTestId('period-month')).toHaveClass(/active/);
  await expect(page.getByTestId('ranking-row').nth(2)).toContainText('19 tareas');

  await page.getByTestId('period-all').click();
  await expect(first).toContainText('640');
  await expect(page.locator('.pod.p2')).toContainText('Pau604 pts');

  await page.getByTestId('period-week').click();
  await expect(first).toContainText('46');
});

test('a slow period that answers after a newer one does not overwrite it', async ({ page, api }) => {
  let releaseMonth: () => void = () => undefined;
  mockShell(api)
    .on('GET', url('week'), RANKING.week)
    .on('GET', url('month'), async (route: Route) => {
      await new Promise<void>((resolve) => (releaseMonth = resolve));
      await route.fulfill({ json: RANKING.month });
    })
    .on('GET', url('all'), RANKING.all);
  await page.goto('/ranking');
  await expect(page.getByTestId('ranking-row')).toHaveCount(3);

  await page.getByTestId('period-month').click();
  await page.getByTestId('period-all').click();
  await expect(page.getByTestId('ranking-row').first()).toContainText('640');
  const monthAnswered = page.waitForResponse((r) => r.url().includes('period=month'));
  releaseMonth();
  await monthAnswered;
  await expect(page.getByTestId('ranking-row').first()).toContainText('640');
});

test('the «Hogar» navigation opens Ranking, and the Miembros tab switches screens', async ({ page, api }) => {
  mockShell(api).on('GET', url('week'), RANKING.week).on('GET', '/households/h-casa/members', []);
  await page.goto('/today');
  await page.getByTestId('nav-household').or(page.getByTestId('bnav-household')).first().click();
  await expect(page.getByTestId('screen-ranking')).toBeVisible();
  await page.getByTestId('tab-members').click();
  await expect(page).toHaveURL(/\/members$/);
});
