// nginx in front of the API (E08): redirects to other sites (Google's sign-in) must reach the browser untouched.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const conf = readFileSync(join(__dirname, '..', 'nginx.conf'), 'utf8');

describe('nginx.conf', () => {
  it('does not rewrite the API redirects', () => {
    const directives = conf.split('\n').filter((l) => l.trim().startsWith('proxy_redirect'));
    expect(directives.map((l) => l.trim())).toEqual(['proxy_redirect off;']);
  });
});
