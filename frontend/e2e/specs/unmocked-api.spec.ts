// E01/US-004 · criterion 3: a request to /api that the test did not mock makes the test fail.
import { test as base, expect } from '@playwright/test';
import { MockApi, test } from '../fixtures/test';

base('an unmocked /api request answers 501 and fails assertAllMocked', async ({ page }) => {
  await page.goto('/');
  const api = new MockApi(page);
  await api.install();
  const status = await page.evaluate(() => fetch('/api/households').then((r) => r.status));
  expect(status).toBe(501);
  expect(api.unmocked).toEqual(['GET /households']);
  expect(() => api.assertAllMocked()).toThrow(/unmocked \/api requests: GET \/households/);
});

test('a mocked request answers its JSON and leaves nothing unmocked', async ({ page, api }) => {
  api.on('GET', '/health', { status: 'ok', version: '0.1.0' });
  await page.goto('/');
  const body = await page.evaluate(() => fetch('/api/health').then((r) => r.json()));
  expect(body).toEqual({ status: 'ok', version: '0.1.0' });
  expect(api.unmocked).toEqual([]);
});
