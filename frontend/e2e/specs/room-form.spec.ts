// E03/US-006 · criterion 4: «Guardar» and «Archivar habitación» go back to the updated list.
import type { Route } from '@playwright/test';
import { ROOMS, TEMPLATES } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

test('a new room with suggested tasks is created, filled from its template, and the list reloads', async ({ page, api }) => {
  let rooms = 0;
  mockShell(api)
    .on('GET', '/households/h-casa/rooms', async (route: Route) => {
      rooms++;
      await route.fulfill({ json: ROOMS });
    })
    .on('GET', '/templates', TEMPLATES)
    .on('POST', '/households/h-casa/rooms', async (route: Route) => route.fulfill({ status: 201, json: { ...ROOMS.rooms[1], id: 'r-nuevo' } }))
    .on('POST', '/households/h-casa/rooms/r-nuevo/from-template', { added: 6 });
  await page.goto('/rooms');
  await page.getByTestId('new-room-desktop').click();

  await page.getByTestId('room-name').fill('Baño de invitados');
  await page.getByRole('button', { name: 'Icono 🛁' }).click();
  await page.getByRole('button', { name: 'Color teal' }).click();
  await page.getByTestId('room-add-zone').click();
  await page.getByLabel('Zona', { exact: true }).fill('Ducha');
  await expect(page.getByTestId('room-from-template')).toHaveText(/Rellenar con tareas sugeridas \(Baño: 6 tareas\)/);
  await page.getByTestId('room-from-template').click();
  await page.getByTestId('room-save').click();

  await expect(page.getByTestId('sheet-room-form')).toHaveCount(0);
  await expect(page).toHaveURL(/\/rooms$/);
  expect(api.calls.find((c) => c.method === 'POST' && c.path === '/households/h-casa/rooms')?.body).toEqual({
    name: 'Baño de invitados', emoji: '🛁', color: 'teal', zones: [{ id: null, name: 'Ducha' }],
  });
  expect(api.calls.find((c) => c.path.endsWith('/from-template'))?.body).toEqual({ templateId: 'bathroom' });
  expect(rooms).toBe(2);
});

test('editing keeps the zone ids; archiving goes back to the list', async ({ page, api }) => {
  mockShell(api)
    .on('GET', '/households/h-casa/rooms', ROOMS)
    .on('GET', '/households/h-casa/rooms/r-cocina', ROOMS.rooms[0])
    .on('PATCH', '/households/h-casa/rooms/r-cocina', ROOMS.rooms[0])
    .on('DELETE', '/households/h-casa/rooms/r-cocina', async (route: Route) => route.fulfill({ status: 204, body: '' }));
  await page.goto('/rooms?sheet=room-edit&room=r-cocina');
  await expect(page.getByTestId('room-name')).toHaveValue('Cocina');
  await page.getByRole('button', { name: 'Quitar zona' }).last().click();
  await page.getByTestId('room-save').click();
  await expect(page.getByTestId('sheet-room-form')).toHaveCount(0);
  expect(api.calls.find((c) => c.method === 'PATCH')?.body).toEqual({ name: 'Cocina', emoji: '🍳', color: 'orange', zones: [{ id: 'z-nevera', name: 'Nevera' }] });

  await page.goto('/rooms/r-cocina?sheet=room-edit&room=r-cocina');
  await page.getByTestId('room-archive').click();
  await expect(page).toHaveURL(/\/rooms$/);
});
