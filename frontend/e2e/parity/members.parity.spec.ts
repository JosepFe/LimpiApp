// E06/US-002 · criteria 1 and 3: #screen-members default, loading and error.
import type { Route } from '@playwright/test';
import { MEMBERS } from '../fixtures/prototype-data';
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

const URL = '/households/h-casa/members';

test('members · default', async ({ page, api }) => {
  mockShell(api).on('GET', URL, MEMBERS);
  await page.goto('/members');
  await expectParity(page, { screen: 'members' });
});

test('members · loading', async ({ page, api }) => {
  mockShell(api).on('GET', URL, () => new Promise(() => undefined));
  await page.goto('/members');
  await expectParity(page, { screen: 'members', state: 'loading' });
});

test('members · error', async ({ page, api }) => {
  mockShell(api).on('GET', URL, async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto('/members');
  await expectParity(page, { screen: 'members', state: 'error' });
});
