// E01/US-003 · criterion 3: the build loads nothing from Google Fonts (Inter ships with the build, D8) and keeps the 500 kB budget.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist/limpiapp/browser');
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));

describe('production build', () => {
  it('exists (run after ng build)', () => {
    expect(existsSync(join(dist, 'index.html'))).toBe(true);
  });

  it('never loads Google Fonts and ships Inter as files', () => {
    const all = files(dist);
    for (const f of all.filter((f) => /\.(html|css|js)$/.test(f))) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    }
    const css = all.filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(css).toContain("font-family:Inter");
    expect(all.some((f) => f.endsWith('.woff2'))).toBe(true);
  });

  it('fails the build above 500 kB initial', () => {
    const angular = JSON.parse(readFileSync(join(root, 'angular.json'), 'utf8'));
    const budgets = angular.projects.limpiapp.architect.build.configurations.production.budgets;
    expect(budgets.find((b: { type: string }) => b.type === 'initial').maximumError).toBe('500kB');
  });
});
