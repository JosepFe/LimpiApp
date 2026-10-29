// E01/US-004 · criterion 4: with the fixtures loaded, the browser clock is Wednesday 14/10/2026 09:00 (Europe/Madrid).
import { expect, mockShell, test } from '../fixtures/test';

test('the browser clock is fixed at the prototype date', async ({ page, api }) => {
  mockShell(api);
  await page.goto('/');
  const now = await page.evaluate(() => ({
    iso: new Date().toISOString(),
    local: new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Madrid' }),
  }));
  expect(now.iso).toBe('2026-10-14T07:00:00.000Z');
  expect(now.local).toBe('miércoles, 14 de octubre de 2026, 9:00');
});
