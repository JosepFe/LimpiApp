// The visual contract lives in the vault; the tests use a copy in e2e/prototype.html (E01 D6).
//   node scripts/prototype-sync.mjs           copies the vault prototype into the repo
//   node scripts/prototype-sync.mjs --check   fails if the copy differs from the vault (without the vault, warns and goes on)
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { repoPrototype, vaultPrototype } from './prototype.mjs';

export function syncPrototype({ check = false, from = vaultPrototype, to = repoPrototype } = {}) {
  if (!existsSync(from)) {
    if (check && existsSync(to)) return { status: 'vault-missing' };
    throw new Error(`Vault prototype not found in ${from} (LIMPIAPP_VAULT)`);
  }
  if (check) {
    const same = existsSync(to) && readFileSync(from).equals(readFileSync(to));
    return { status: same ? 'same' : 'different' };
  }
  copyFileSync(from, to);
  return { status: 'copied' };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check');
  const { status } = syncPrototype({ check });
  const messages = {
    copied: 'Prototype copied from the vault to e2e/prototype.html',
    same: 'e2e/prototype.html matches the vault',
    different: 'e2e/prototype.html does NOT match the vault: run `npm run prototype:sync`',
    'vault-missing': 'Vault not reachable: using e2e/prototype.html as is',
  };
  console.log(messages[status]);
  if (status === 'different') process.exit(1);
}
