// E06/US-004: «Invitar» opens the sheet; copy, share (or copy without a share sheet), renew an expired link,
// retry after an error and revoke.
import type { Route } from '@playwright/test';
import { INVITE, ME, MEMBERS } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

const CURRENT = '/households/h-casa/invites/current';
const NEW_INVITE = { ...INVITE, id: 'i-new', code: 'Zz9Yy8Xx7Ww6Vv', url: 'https://limpiapp.example.com/join/Zz9Yy8Xx7Ww6Vv', uses: 0, expiresAt: '2026-10-21T07:00:00Z' };

test('«Invitar» without a link creates one; «Copiar enlace» copies it and says «Copiado»', async ({ page, api, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  mockShell(api)
    .on('GET', '/households/h-casa/members', MEMBERS)
    .on('GET', CURRENT, async (route: Route) => route.fulfill({ status: 404, json: {} }))
    .on('POST', '/households/h-casa/invites', async (route: Route) => route.fulfill({ status: 201, json: NEW_INVITE }));
  await page.goto('/members');
  await page.getByTestId('invite-open').click();

  await expect(page.getByTestId('invite-link')).toHaveText('limpiapp.example.com/join/Zz9Yy8Xx7Ww6Vv');
  await expect(page.getByTestId('sheet-invite')).toContainText('0 de 5');
  await page.getByTestId('invite-copy').click();
  await expect(page.getByTestId('invite-copy')).toHaveText('Copiado');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(NEW_INVITE.url);

  await page.getByTestId('invite-done').click();
  await expect(page).toHaveURL(/\/members$/);
});

test('«Compartir» opens the phone share sheet with the link', async ({ page, api, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  mockShell(api).on('GET', '/households/h-casa/members', MEMBERS).on('GET', CURRENT, INVITE);
  await page.addInitScript(() => {
    (window as unknown as { shared: unknown[] }).shared = [];
    Object.defineProperty(navigator, 'share', { value: async (data: unknown) => void (window as unknown as { shared: unknown[] }).shared.push(data) });
  });
  await page.goto('/members?sheet=invite');
  await page.getByTestId('invite-share').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { shared: { url: string; text: string }[] }).shared)).toEqual([
    { title: 'LimpiApp', text: 'Únete a Casa Pau y Josep en LimpiApp', url: INVITE.url },
  ]);
});

test('without a share sheet «Compartir» copies the link', async ({ page, api, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  mockShell(api).on('GET', '/households/h-casa/members', MEMBERS).on('GET', CURRENT, INVITE);
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined }));
  await page.goto('/members?sheet=invite');
  await page.getByTestId('invite-share').click();
  await expect(page.getByRole('status')).toContainText('Enlace copiado');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(INVITE.url);
});

test('an expired link: «Generar enlace nuevo» replaces it', async ({ page, api }) => {
  mockShell(api)
    .on('GET', '/households/h-casa/members', MEMBERS)
    .on('GET', CURRENT, { ...INVITE, expired: true })
    .on('POST', '/households/h-casa/invites', async (route: Route) => route.fulfill({ status: 201, json: NEW_INVITE }));
  await page.goto('/members?sheet=invite');
  await expect(page.getByTestId('invite-expired')).toBeVisible();

  await page.getByTestId('invite-new').click();

  await expect(page.getByTestId('invite-expired')).toHaveCount(0);
  await expect(page.getByTestId('invite-link')).toHaveText('limpiapp.example.com/join/Zz9Yy8Xx7Ww6Vv');
  await expect(page.getByTestId('sheet-invite')).toContainText('Caduca en 7 días');
  await expect(page.getByRole('status')).toContainText('Enlace nuevo creado');
});

test('after an error «Reintentar» creates the link; «Revocar enlace» revokes it and closes', async ({ page, api }) => {
  let fail = true;
  mockShell(api)
    .on('GET', '/households/h-casa/members', MEMBERS)
    .on('GET', CURRENT, async (route: Route) => (fail ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ status: 404, json: {} })))
    .on('POST', '/households/h-casa/invites', async (route: Route) => route.fulfill({ status: 201, json: NEW_INVITE }))
    .on('DELETE', '/households/h-casa/invites/i-new', async (route: Route) => route.fulfill({ status: 204, body: '' }));
  await page.goto('/members?sheet=invite');
  await expect(page.getByTestId('invite-revoke')).toBeDisabled();
  fail = false;
  await page.getByTestId('retry').click();
  await expect(page.getByTestId('invite-link')).toBeVisible();

  await page.getByTestId('invite-revoke').click();

  await expect(page.getByTestId('sheet-invite')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Enlace revocado');
  expect(api.calls.some((c) => c.method === 'DELETE')).toBe(true);
});

test('a member cannot open the sheet with ?sheet=invite', async ({ page, api }) => {
  mockShell(api, { ...ME, households: [{ ...ME.households[0], role: 'member' }] }).on('GET', '/households/h-casa/members', MEMBERS);
  await page.goto('/members?sheet=invite');
  await expect(page.getByTestId('member-row')).toHaveCount(3);
  await expect(page.getByTestId('sheet-invite')).toHaveCount(0);
});
