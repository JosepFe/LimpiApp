// E01/US-003 · criterion 1: `npm run qa` chains lint, typecheck, unit tests (with coverage), Node tests and build, in order.
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const angular = JSON.parse(readFileSync(new URL('../angular.json', import.meta.url), 'utf8'));

describe('npm run qa', () => {
  it('chains the gates in order and stops at the first failure (&&)', () => {
    const steps = pkg.scripts.qa.split('&&').map((s: string) => s.trim());
    expect(steps.slice(0, 5)).toEqual(['npm run lint', 'npm run typecheck', 'npm test', 'npm run test:node', 'npm run build']);
  });

  it('every chained script exists', () => {
    for (const step of pkg.scripts.qa.split('&&').map((s: string) => s.trim())) {
      const name = step === 'npm test' ? 'test' : step.replace('npm run ', '');
      expect(pkg.scripts[name], name).toBeTruthy();
    }
  });

  it('lint allows no warnings', () => {
    expect(pkg.scripts.lint).toContain('--max-warnings 0');
  });
});

describe('unit coverage gate (gate 7)', () => {
  it('npm test measures coverage and fails under 70 %', () => {
    expect(pkg.scripts.test).toContain('--coverage');
    const thresholds = angular.projects.limpiapp.architect.test.options.coverageThresholds;
    expect(thresholds).toEqual({ statements: 70, branches: 70, functions: 70, lines: 70 });
  });
});
