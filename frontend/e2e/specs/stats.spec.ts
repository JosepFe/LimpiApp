// E05/US-005 · criterion 2: 12 bars labelled 31 … 42, heights relative to the best week, each with an accessible text.
import { STATS } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

test('the weekly chart has 12 bars 31 … 42, the last one is the current week and the tallest is 100 %', async ({ page, api }) => {
  mockShell(api).on('GET', '/households/h-casa/stats', STATS);
  await page.goto('/stats');
  const bars = page.locator('.bars .b');
  await expect(bars).toHaveCount(12);
  await expect(bars.locator('span')).toHaveText(Array.from({ length: 12 }, (_, i) => String(31 + i)));
  await expect(bars.last()).toHaveClass(/cur/);
  await expect(bars.last()).toHaveAttribute('title', 'Semana 42: 18');
  expect(await bars.last().locator('i').evaluate((i) => (i as HTMLElement).style.height)).toBe('100%');
  expect(await bars.first().locator('i').evaluate((i) => (i as HTMLElement).style.height)).toMatch(/^33\.3/);
  await expect(page.getByRole('img', { name: 'Josep 46 %, Pau 38 %, Marta 16 %' })).toBeVisible();
  await expect(page.getByTestId('tab-history')).toHaveAttribute('href', '/history');
});
