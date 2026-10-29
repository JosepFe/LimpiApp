// Production build checks (after ng build): `npm run build` runs them.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', globals: true, include: ['scripts/check-build.spec.ts'] },
});
