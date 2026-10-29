// E06/US-005 · criterion 2: without a session, «Unirme al hogar» goes through the login and, back here, joins and
// goes to Hoy of that household.
import type { Route } from '@playwright/test';
import { INVITE_CODE, INVITE_PREVIEW, ME, TODAY_SUMMARY } from '../fixtures/prototype-data';
import { expect, test } from '../fixtures/test';

const NEW_ME = { ...ME, households: [{ id: 'h-casa', name: 'Casa Pau y Josep', role: 'member', memberCount: 4 }] };

test('without a session: login with return, then back to /join it joins and opens Hoy of the household', async ({ page, api }) => {
  let signedIn = false;
  let joined = false;
  api
    .on('GET', '/auth/me', async (route: Route) =>
      signedIn ? route.fulfill({ json: joined ? NEW_ME : { ...ME, households: [] } }) : route.fulfill({ status: 401, json: {} }))
    .on('GET', `/invites/${INVITE_CODE}`, INVITE_PREVIEW)
    .on('POST', `/invites/${INVITE_CODE}/accept`, async (route: Route) => {
      joined = true;
      await route.fulfill({ json: { status: 'joined', householdId: 'h-casa' } });
    })
    .on('GET', '/households/h-casa/today', TODAY_SUMMARY);
  await page.goto(`/join/${INVITE_CODE}`);

  await page.getByTestId('join-accept').click();
  await expect(page).toHaveURL(`/login?return=${encodeURIComponent(`/join/${INVITE_CODE}`)}`);

  // The emailed link signs in and the API redirects the browser to the return URL.
  signedIn = true;
  await page.goto(`/join/${INVITE_CODE}`);

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('status')).toContainText('Te has unido al hogar');
  expect(api.calls.filter((c) => c.method === 'POST')).toHaveLength(1);
});

test('signed in: «Unirme al hogar» joins at once; a link opened later without pressing it does not join', async ({ page, api }) => {
  let joined = false;
  api
    .on('GET', '/auth/me', () => (joined ? NEW_ME : { ...ME, households: [] }))
    .on('GET', `/invites/${INVITE_CODE}`, INVITE_PREVIEW)
    .on('POST', `/invites/${INVITE_CODE}/accept`, async (route: Route) => {
      joined = true;
      await route.fulfill({ json: { status: 'joined', householdId: 'h-casa' } });
    })
    .on('GET', '/households/h-casa/today', TODAY_SUMMARY);
  await page.goto(`/join/${INVITE_CODE}`);
  await expect(page.getByTestId('join-valid')).toBeVisible();
  expect(api.calls.some((c) => c.method === 'POST')).toBe(false);

  await page.getByTestId('join-accept').click();

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByTestId('home-switch').first()).toContainText('Casa Pau y Josep');
});

test('accepting a link that expired meanwhile shows «Invitación caducada»; «Ahora no» goes back to the app', async ({ page, api }) => {
  api
    .on('GET', '/auth/me', ME)
    .on('GET', '/households/h-casa/today', TODAY_SUMMARY)
    .on('GET', `/invites/${INVITE_CODE}`, INVITE_PREVIEW)
    .on('POST', `/invites/${INVITE_CODE}/accept`, async (route: Route) => route.fulfill({ status: 410, json: { status: 'expired' } }));
  await page.goto(`/join/${INVITE_CODE}`);

  await page.getByTestId('join-accept').click();
  await expect(page.getByTestId('join-expired')).toBeVisible();

  await page.getByRole('button', { name: 'Ir a mis hogares' }).click();
  await expect(page).toHaveURL(/\/today$/);
});

test('«Ahora no» without a session goes to the login', async ({ page, api }) => {
  api.on('GET', '/auth/me', async (route: Route) => route.fulfill({ status: 401, json: {} })).on('GET', `/invites/${INVITE_CODE}`, INVITE_PREVIEW);
  await page.goto(`/join/${INVITE_CODE}`);

  await page.getByRole('button', { name: 'Ahora no' }).click();

  await expect(page).toHaveURL(/\/login$/);
});
