// E03/US-004 · criteria 1 and 4: #screen-products in its four states.
import type { Route } from '@playwright/test';
import { PRODUCTS } from '../fixtures/prototype-data';
import { mockShell, test } from '../fixtures/test';
import { expectParity } from './parity';

const URL = '/households/h-casa/products';

test('products · default', async ({ page, api }) => {
  mockShell(api).on('GET', URL, PRODUCTS);
  await page.goto('/products');
  await expectParity(page, { screen: 'products' });
});

test('products · loading', async ({ page, api }) => {
  mockShell(api).on('GET', URL, () => new Promise(() => undefined));
  await page.goto('/products');
  await expectParity(page, { screen: 'products', state: 'loading' });
});

test('products · empty', async ({ page, api }) => {
  mockShell(api).on('GET', URL, []);
  await page.goto('/products');
  await expectParity(page, { screen: 'products', state: 'empty' });
});

test('products · error', async ({ page, api }) => {
  mockShell(api).on('GET', URL, async (route: Route) => route.fulfill({ status: 500, json: {} }));
  await page.goto('/products');
  await expectParity(page, { screen: 'products', state: 'error' });
});
