// E02/US-006 · criteria 1 and 3: #screen-onboarding step 1 (default) and its error.
import { ME } from '../fixtures/prototype-data';
import { test } from '../fixtures/test';
import { expectParity } from './parity';

test.beforeEach(({ api }) => {
  api.on('GET', '/auth/me', { ...ME, households: [] });
});

test('onboarding · default', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByTestId('onboarding-name').fill('Casa Pau y Josep');
  await expectParity(page, { screen: 'onboarding' });
});
