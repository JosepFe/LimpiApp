// E04/US-005 · criteria 1, 2 and 4: #screen-complete default, partial, saving, error and success.
import type { Route } from '@playwright/test';
import { COMPLETE_RESULT, COMPLETE_TASK } from '../fixtures/prototype-data';
import { photos } from '../fixtures/photos';
import { mockShell, test, type MockApi } from '../fixtures/test';
import { expectParity } from './parity';

const SHEET = '/today?sheet=complete&task=t-nevera';
const POST = '/households/h-casa/tasks/t-nevera/complete';
const mock = (api: MockApi) => mockShell(api).on('GET', '/households/h-casa/tasks/t-nevera', COMPLETE_TASK);

test('complete · default', async ({ page, api }) => {
  mock(api);
  await page.goto(SHEET);
  await expectParity(page, { screen: 'complete' });
});

test('complete · partial', async ({ page, api }) => {
  mock(api);
  await page.goto(SHEET);
  for (const n of [3, 4]) await page.getByTestId('complete-check').nth(n).click();
  await expectParity(page, { screen: 'complete', state: 'partial' });
});

test('complete · saving', async ({ page, api }) => {
  mock(api).on('POST', POST, () => new Promise(() => undefined));
  await page.goto(SHEET);
  await page.getByTestId('complete-confirm').click();
  await expectParity(page, { screen: 'complete', state: 'saving' });
});

test('complete · error', async ({ page, api }) => {
  mock(api).on('POST', POST, async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto(SHEET);
  await page.getByTestId('complete-confirm').click();
  await expectParity(page, { screen: 'complete', state: 'error' });
});

test('complete · success', async ({ page, api }) => {
  mock(api).on('POST', POST, async (route: Route) => route.fulfill({ status: 201, json: COMPLETE_RESULT }));
  await page.goto(SHEET);
  await page.getByTestId('complete-confirm').click();
  await expectParity(page, { screen: 'complete', state: 'success' });
});

// E04/US-006 · criterion 1: with three photos chosen.
test('complete · with-photos', async ({ page, api }) => {
  mock(api);
  await page.goto(SHEET);
  await page.getByLabel('Elegir fotos').setInputFiles(photos(3));
  await expectParity(page, { screen: 'complete', state: 'with-photos' });
});
