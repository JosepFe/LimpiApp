// E03/US-004 · criteria 2 and 3: add a product and archive one.
import type { Route } from '@playwright/test';
import { PRODUCTS } from '../fixtures/prototype-data';
import { expect, mockShell, test } from '../fixtures/test';

test('«Añadir» adds the product to the list; archiving removes it', async ({ page, api }) => {
  mockShell(api)
    .on('GET', '/households/h-casa/products', PRODUCTS)
    .on('POST', '/households/h-casa/products', async (route: Route) =>
      route.fulfill({ status: 201, json: { id: 'p-vinagre', name: 'Vinagre', emoji: '🧴', taskCount: 0 } }))
    .on('DELETE', '/households/h-casa/products/p-fregona', async (route: Route) => route.fulfill({ status: 204, body: '' }));
  await page.goto('/products');

  await page.getByTestId('product-new-name').fill('Vinagre');
  await page.getByTestId('product-add').click();
  await expect(page.getByTestId('product-row').last()).toHaveText(/Vinagre\s*Usado en 0 tareas/);
  expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({ name: 'Vinagre' });

  await page.getByRole('button', { name: 'Archivar Fregona' }).click();
  await expect(page.getByTestId('product-row')).toHaveCount(6);
  await expect(page.getByText('Fregona')).toHaveCount(0);
});

test('from the empty state, «Añadir producto» shows the form; «Reintentar» reloads after an error', async ({ page, api }) => {
  let fail = true;
  mockShell(api).on('GET', '/households/h-casa/products', async (route: Route) =>
    fail ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ json: [] }));
  await page.goto('/products');
  await expect(page.getByTestId('retry')).toBeVisible();
  fail = false;
  await page.getByTestId('retry').click();
  await page.getByRole('button', { name: 'Añadir producto' }).click();
  await expect(page.getByTestId('product-new-name')).toBeVisible();
});
