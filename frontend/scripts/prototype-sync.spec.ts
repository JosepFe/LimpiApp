// E01/US-004 · criterion 1: the repo copy of the prototype is synced from the vault and a difference is detected (D6).
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncPrototype } from './prototype-sync.mjs';

const dir = () => mkdtempSync(join(tmpdir(), 'la-proto-'));

describe('prototype sync', () => {
  it('copies the vault prototype into the repo', () => {
    const d = dir();
    writeFileSync(join(d, 'vault.html'), '<p>contract</p>');
    expect(syncPrototype({ from: join(d, 'vault.html'), to: join(d, 'repo.html') }).status).toBe('copied');
    expect(readFileSync(join(d, 'repo.html'), 'utf8')).toBe('<p>contract</p>');
  });

  it('check reports same or different', () => {
    const d = dir();
    writeFileSync(join(d, 'vault.html'), 'v1');
    writeFileSync(join(d, 'repo.html'), 'v1');
    expect(syncPrototype({ check: true, from: join(d, 'vault.html'), to: join(d, 'repo.html') }).status).toBe('same');
    writeFileSync(join(d, 'vault.html'), 'v2');
    expect(syncPrototype({ check: true, from: join(d, 'vault.html'), to: join(d, 'repo.html') }).status).toBe('different');
  });

  it('without the vault, check keeps using the repo copy', () => {
    const d = dir();
    writeFileSync(join(d, 'repo.html'), 'v1');
    expect(syncPrototype({ check: true, from: join(d, 'missing.html'), to: join(d, 'repo.html') }).status).toBe('vault-missing');
  });
});
