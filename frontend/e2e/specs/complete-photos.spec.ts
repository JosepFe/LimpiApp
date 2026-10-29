// E04/US-006 · criteria 1 and 2: up to 3 photos with «×»; they are uploaded after the completion exists.
import type { Route } from '@playwright/test';
import { COMPLETE_RESULT, COMPLETE_TASK } from '../fixtures/prototype-data';
import { photos } from '../fixtures/photos';
import { expect, mockShell, test } from '../fixtures/test';

test('three photos at most; «×» removes one; confirming uploads each to the completion', async ({ page, api }) => {
  let uploads = 0;
  mockShell(api)
    .on('GET', '/households/h-casa/tasks/t-nevera', COMPLETE_TASK)
    .on('POST', '/households/h-casa/tasks/t-nevera/complete', async (route: Route) => route.fulfill({ status: 201, json: COMPLETE_RESULT }))
    .on('POST', '/households/h-casa/completions/c-nevera/photos', async (route: Route) => {
      uploads++;
      expect(route.request().headers()['content-type']).toMatch(/^multipart\/form-data/);
      await route.fulfill({ status: 201, json: { id: `p${uploads}`, url: `/households/h-casa/photos/p${uploads}` } });
    });
  await page.goto('/today?sheet=complete&task=t-nevera');

  await page.getByLabel('Elegir fotos').setInputFiles(photos(4)); // a fourth is ignored
  await expect(page.getByRole('img', { name: 'Foto' })).toHaveCount(3);
  await expect(page.getByTestId('complete-add-photo')).toHaveCount(0);
  await expect(page.getByText('3 de 3')).toBeVisible();

  await page.getByRole('button', { name: 'Quitar foto' }).first().click();
  await expect(page.getByTestId('complete-add-photo')).toBeVisible();

  await page.getByTestId('complete-confirm').click();
  await expect(page.getByTestId('complete-success')).toBeVisible();
  expect(uploads).toBe(2);
});

test('a photo that cannot be uploaded keeps the completion and says so', async ({ page, api }) => {
  mockShell(api)
    .on('GET', '/households/h-casa/tasks/t-nevera', COMPLETE_TASK)
    .on('POST', '/households/h-casa/tasks/t-nevera/complete', async (route: Route) => route.fulfill({ status: 201, json: COMPLETE_RESULT }))
    .on('POST', '/households/h-casa/completions/c-nevera/photos', async (route: Route) => route.fulfill({ status: 400, json: {} }));
  await page.goto('/today?sheet=complete&task=t-nevera');
  await page.getByLabel('Elegir fotos').setInputFiles(photos(1));
  await page.getByTestId('complete-confirm').click();
  await expect(page.getByTestId('complete-success')).toContainText('¡Hecho!');
  await expect(page.getByRole('alert')).toHaveText('Alguna foto no se ha podido subir.');
});

// E04/US-006 · criterion 4, in a real browser: a 2000 px PNG is re-encoded as JPEG (≤ 1600 px); a small one is sent as is.
test('a big photo is reduced to a JPEG before uploading; a small one is not touched', async ({ page, api }) => {
  const parts: string[] = [];
  mockShell(api)
    .on('GET', '/households/h-casa/tasks/t-nevera', COMPLETE_TASK)
    .on('POST', '/households/h-casa/tasks/t-nevera/complete', async (route: Route) => route.fulfill({ status: 201, json: COMPLETE_RESULT }))
    .on('POST', '/households/h-casa/completions/c-nevera/photos', async (route: Route) => {
      parts.push(route.request().postDataBuffer()!.toString('latin1').match(/Content-Type: (image\/\w+)/)![1]);
      await route.fulfill({ status: 201, json: { id: 'p', url: '/x' } });
    });
  await page.goto('/today?sheet=complete&task=t-nevera');
  const big = await page.evaluate(async () => {
    const canvas = new OffscreenCanvas(2000, 1500);
    canvas.getContext('2d')!.fillRect(0, 0, 2000, 1500);
    const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer());
    return btoa(String.fromCharCode(...bytes));
  });
  await page.getByLabel('Elegir fotos').setInputFiles([{ name: 'grande.png', mimeType: 'image/png', buffer: Buffer.from(big, 'base64') }, ...photos(1)]);
  await expect(page.getByRole('img', { name: 'Foto' })).toHaveCount(2);
  await page.getByTestId('complete-confirm').click();
  await expect(page.getByTestId('complete-success')).toBeVisible();
  expect(parts).toEqual(['image/jpeg', 'image/png']);
});
