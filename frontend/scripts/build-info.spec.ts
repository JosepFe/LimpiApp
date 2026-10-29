// The version shown in Ajustes («LimpiApp 0.1.0 · build …») is the package's, and the Docker build sets the build id.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(__dirname, '..', path), 'utf8');

describe('build info', () => {
  it('VERSION matches package.json', () => {
    const { version } = JSON.parse(read('package.json')) as { version: string };
    expect(read('src/app/core/build-info.ts')).toContain(`export const VERSION = '${version}';`);
  });

  it('the Docker build defines LIMPIAPP_BUILD', () => {
    expect(read('Dockerfile')).toMatch(/ng build --define "LIMPIAPP_BUILD=/);
  });
});
