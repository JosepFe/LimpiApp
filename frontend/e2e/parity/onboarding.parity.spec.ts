// E02/US-006 · criteria 1 and 3 (default, error) and E02/US-007 · criteria 1 and 4 (step-templates, creating).
import type { Route } from '@playwright/test';
import { ME, TEMPLATES } from '../fixtures/prototype-data';
import { test } from '../fixtures/test';
import { expectParity } from './parity';

test.beforeEach(({ api }) => {
  api.on('GET', '/auth/me', { ...ME, households: [] }).on('GET', '/templates', TEMPLATES);
});

async function toTemplates(page: import('@playwright/test').Page) {
  await page.goto('/onboarding');
  await page.getByTestId('onboarding-name').fill('Casa Pau y Josep');
  await page.getByTestId('onboarding-next').click();
}

test('onboarding · default', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByTestId('onboarding-name').fill('Casa Pau y Josep');
  await expectParity(page, { screen: 'onboarding' });
});

test('onboarding · step-templates', async ({ page }) => {
  await toTemplates(page);
  await expectParity(page, { screen: 'onboarding', state: 'step-templates' });
});

test('onboarding · creating', async ({ page, api }) => {
  api.on('POST', '/households', () => new Promise(() => undefined)); // never answers: stays creating
  await toTemplates(page);
  await page.getByTestId('onboarding-create').click();
  await expectParity(page, { screen: 'onboarding', state: 'creating' });
});

test('onboarding · error', async ({ page, api }) => {
  api.on('POST', '/households', async (route: Route) => route.fulfill({ status: 500, json: { title: 'x' } }));
  await toTemplates(page);
  await page.getByTestId('onboarding-create').click();
  await expectParity(page, { screen: 'onboarding', state: 'error' });
});
