// E01/US-006 · criterion 4: the shell navigation over #screen-today matches the prototype (sidebar or bottom bar).
import { mockShell, test } from '../fixtures/test';
import { expectRegionParity } from './parity';

test('shell navigation', async ({ page, api }) => {
  mockShell(api);
  await page.goto('/today');
  const desktop = (page.viewportSize()?.width ?? 0) >= 1024;
  await expectRegionParity(page, { screen: 'today', region: desktop ? 'aside.sidebar' : 'nav.bottom-nav' });
});
