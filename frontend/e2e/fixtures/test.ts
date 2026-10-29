// Base fixture for E2E and parity: fixed clock (Wed 14/10/2026 09:00, Europe/Madrid) and mocked API.
// It is automatic: every test importing this `test` has it, used or not. Any /api request the test did not mock
// answers 501 and fails the test at the end.
import { test as base, expect, type Page, type Route } from '@playwright/test';
import { FIXED_NOW, ME, TODAY_SUMMARY } from './prototype-data';

export type Handler = unknown | ((route: Route, body: unknown) => unknown);

export class MockApi {
  private routes = new Map<string, Handler>();
  readonly unmocked: string[] = [];
  readonly calls: { method: string; path: string; body: unknown }[] = [];

  constructor(private page: Page) {}

  async install(): Promise<void> {
    await this.page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.replace(/^\/api/, '') + url.search;
      const key = `${request.method()} ${path}`;
      const body = request.postDataJSON?.() ?? null;
      this.calls.push({ method: request.method(), path, body });
      const handler = this.routes.get(key) ?? this.routes.get(`${request.method()} ${url.pathname.replace(/^\/api/, '')}`);
      if (handler === undefined) {
        this.unmocked.push(key);
        await route.fulfill({ status: 501, json: { detail: `not mocked: ${key}` } });
        return;
      }
      const reply = typeof handler === 'function' ? await (handler as (r: Route, b: unknown) => unknown)(route, body) : handler;
      if (reply !== undefined) await route.fulfill({ status: 200, json: reply });
    });
  }

  /** Mocks `METHOD /path` (without /api), with or without query. The value is the JSON reply or a function
   * (if the function returns undefined, it answers itself with `route.fulfill`). */
  on(method: string, path: string, reply: Handler): this {
    this.routes.set(`${method} ${path}`, reply);
    return this;
  }

  assertAllMocked(): void {
    expect(this.unmocked, `unmocked /api requests: ${this.unmocked.join(', ')}`).toEqual([]);
  }
}

export const test = base.extend<{ api: MockApi }>({
  api: [
    async ({ page }, use) => {
      await page.clock.setFixedTime(new Date(FIXED_NOW));
      const api = new MockApi(page);
      await api.install();
      await use(api);
      api.assertAllMocked();
    },
    { auto: true },
  ],
});

export { expect };

/** What the shell asks for on any screen: the session and the «Hoy» counter of the active household. */
export function mockShell(api: MockApi, me: object = ME): MockApi {
  return api.on('GET', '/auth/me', me).on('GET', '/households/h-casa/today', TODAY_SUMMARY);
}
