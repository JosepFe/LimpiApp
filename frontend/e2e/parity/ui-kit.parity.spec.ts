// E01/US-006 · criterion 3: /ui-kit reproduces #screen-ui-kit, in light and with ?theme=dark.
import { expect, mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

test('ui-kit (light)', async ({ page, api }) => {
  mockShell(api);
  await page.goto('/ui-kit');
  await expectParity(page, { screen: 'ui-kit' });
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-theme'))).toBe(false);
});

test('ui-kit (dark)', async ({ page, api }) => {
  mockShell(api);
  await page.goto('/ui-kit?theme=dark');
  await expectParity(page, { screen: 'ui-kit', theme: 'dark' });
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
});
