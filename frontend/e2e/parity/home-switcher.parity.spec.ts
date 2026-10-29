// E02/US-008 · criteria 1 and 3: «Mis hogares» (#screen-home-switcher) and the empty name of a new household.
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

test('home-switcher · default', async ({ page, api }) => {
  mockShell(api);
  await page.goto('/today?sheet=homes');
  await expectParity(page, { screen: 'home-switcher' });
});

test('home-switcher · empty-name', async ({ page, api }) => {
  mockShell(api);
  await page.goto('/today?sheet=homes');
  await page.getByTestId('home-create').click();
  await page.getByTestId('home-create-submit').click();
  await expectParity(page, { screen: 'home-switcher', state: 'empty-name' });
});
