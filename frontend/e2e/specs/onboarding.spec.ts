// E02/US-006 · criterion 2: without a name, «Siguiente» does not advance and marks the field.
import { ME } from '../fixtures/prototype-data';
import { expect, test } from '../fixtures/test';

test('without a name «Siguiente» does not advance and marks the field', async ({ page, api }) => {
  api.on('GET', '/auth/me', { ...ME, households: [] });
  await page.goto('/onboarding');
  await page.getByTestId('onboarding-next').click();
  await expect(page.getByTestId('onboarding-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('onboarding-next')).toBeVisible();
});
