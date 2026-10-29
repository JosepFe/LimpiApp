// E03/US-006 · criteria 1-3: #screen-room-form new, edit (Cocina with Nevera and Horno) and validation-error.
import { ROOMS, TEMPLATES } from '../fixtures/prototype-data';
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

test.beforeEach(({ api }) => {
  mockShell(api).on('GET', '/households/h-casa/rooms', ROOMS).on('GET', '/templates', TEMPLATES).on('GET', '/households/h-casa/rooms/r-cocina', ROOMS.rooms[0]);
});

test('room-form · new', async ({ page }) => {
  await page.goto('/rooms?sheet=room-new');
  await expectParity(page, { screen: 'room-form', state: 'new' });
});

test('room-form · edit', async ({ page }) => {
  await page.goto('/rooms?sheet=room-edit&room=r-cocina');
  await expectParity(page, { screen: 'room-form', state: 'edit' });
});

test('room-form · validation-error', async ({ page }) => {
  await page.goto('/rooms?sheet=room-new');
  for (const zone of ['Nevera', 'Horno']) {
    await page.getByTestId('room-add-zone').click();
    await page.getByLabel('Zona', { exact: true }).last().fill(zone);
  }
  await page.getByTestId('room-save').click();
  await expectParity(page, { screen: 'room-form', state: 'validation-error' });
});
