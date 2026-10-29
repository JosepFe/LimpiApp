// E2E (e2e/specs) and parity with the prototype (e2e/parity). Chromium, Spanish, Europe/Madrid. Desktop 1440×1000;
// parity also at 390×844 (mobile first: the prototype has a bottom bar on phones).
import { defineConfig, devices } from '@playwright/test';

const PORT = 4310;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: true,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 1000 },
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  },
  projects: [
    { name: 'e2e', testDir: 'e2e/specs' },
    { name: 'parity', testDir: 'e2e/parity' },
    // helper.spec tests the parity tool with loose HTML: it does not depend on the width
    { name: 'parity-mobile', testDir: 'e2e/parity', testIgnore: /helper\.spec\.ts/, use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npx ng serve --port ${PORT} --no-live-reload`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
