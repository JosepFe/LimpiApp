// E06/US-004 · criteria 1-3: #screen-invite default, copied, expired and error.
import type { Route } from '@playwright/test';
import { INVITE, MEMBERS } from '../fixtures/prototype-data';
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

const CURRENT = '/households/h-casa/invites/current';

test('invite · default', async ({ page, api }) => {
  mockShell(api).on('GET', '/households/h-casa/members', MEMBERS).on('GET', CURRENT, INVITE);
  await page.goto('/members?sheet=invite');
  await expectParity(page, { screen: 'invite' });
});

test('invite · copied', async ({ page, api, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  mockShell(api).on('GET', '/households/h-casa/members', MEMBERS).on('GET', CURRENT, INVITE);
  await page.goto('/members?sheet=invite');
  await page.getByTestId('invite-copy').click();
  await expectParity(page, { screen: 'invite', state: 'copied' });
});

test('invite · expired', async ({ page, api }) => {
  mockShell(api).on('GET', '/households/h-casa/members', MEMBERS).on('GET', CURRENT, { ...INVITE, expired: true });
  await page.goto('/members?sheet=invite');
  await expectParity(page, { screen: 'invite', state: 'expired' });
});

test('invite · error', async ({ page, api }) => {
  mockShell(api)
    .on('GET', '/households/h-casa/members', MEMBERS)
    .on('GET', CURRENT, async (route: Route) => route.fulfill({ status: 404, json: {} }))
    .on('POST', '/households/h-casa/invites', async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto('/members?sheet=invite');
  await expectParity(page, { screen: 'invite', state: 'error' });
});
