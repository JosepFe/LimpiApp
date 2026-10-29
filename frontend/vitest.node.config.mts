// Tests that run in Node (not in the browser): scripts, tokens and build checks.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['scripts/**/*.spec.ts', 'src/styles/**/*.spec.ts'],
    exclude: ['scripts/check-build.spec.ts'], // needs the build: `npm run build` runs it
  },
});
