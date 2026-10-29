// E06/US-005 · criteria 1 and 3: #screen-join default, invalid, expired and already-member.
import type { Route } from '@playwright/test';
import { INVITE_CODE, INVITE_NOTHING, INVITE_PREVIEW } from '../fixtures/prototype-data';
import { test } from '../fixtures/test';
import { expectParity } from './parity';

const URL = `/invites/${INVITE_CODE}`;
const noSession = async (route: Route) => route.fulfill({ status: 401, json: {} });
const cases: [string, string | undefined, unknown][] = [
  ['default', undefined, INVITE_PREVIEW],
  ['invalid', 'invalid', INVITE_NOTHING],
  ['expired', 'expired', { ...INVITE_NOTHING, status: 'expired' }],
  ['already-member', 'already-member', { ...INVITE_PREVIEW, status: 'already-member' }],
];

for (const [name, state, body] of cases) {
  test(`join · ${name}`, async ({ page, api }) => {
    api.on('GET', '/auth/me', noSession).on('GET', URL, body);
    await page.goto(`/join/${INVITE_CODE}`);
    await expectParity(page, { screen: 'join', state });
  });
}

test('join · invalid when the preview fails', async ({ page, api }) => {
  api.on('GET', '/auth/me', noSession).on('GET', URL, async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto(`/join/${INVITE_CODE}`);
  await expectParity(page, { screen: 'join', state: 'invalid' });
});
