// E01/US-003 · criterion 4: lint requires the `la-` prefix, standalone components and OnPush (in Angular 22, not opting out of it).
import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';

const eslint = new ESLint({ cwd: fileURLToPath(new URL('..', import.meta.url)) });

async function rules(code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: 'src/app/probe.ts' });
  return result.messages.map((m) => m.ruleId ?? m.message);
}

const component = (meta: string) => `import { ChangeDetectionStrategy, Component } from '@angular/core';
void ChangeDetectionStrategy;
@Component({ ${meta}, template: '' })
export class Probe {}
`;

describe('lint rules', () => {
  it('accepts a standalone la- component with the default change detection', async () => {
    expect(await rules(component("selector: 'la-probe'"))).toEqual([]);
  });

  it('rejects another prefix', async () => {
    expect(await rules(component("selector: 'app-probe'"))).toContain('@angular-eslint/component-selector');
  });

  it('rejects opting out of OnPush', async () => {
    expect(await rules(component("selector: 'la-probe', changeDetection: ChangeDetectionStrategy.Eager"))).toContain(
      '@angular-eslint/prefer-on-push-component-change-detection',
    );
  });

  it('rejects non-standalone components', async () => {
    expect(await rules(component("selector: 'la-probe', standalone: false"))).toContain('@angular-eslint/prefer-standalone');
  });
});
