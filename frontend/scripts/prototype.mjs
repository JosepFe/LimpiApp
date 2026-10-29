// Where the visual contract lives: the vault prototype (LIMPIAPP_VAULT) or, failing that, the repo copy (e2e/prototype.html).
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const frontendDir = join(dirname(fileURLToPath(import.meta.url)), '..');
export const vaultDir =
  process.env.LIMPIAPP_VAULT ?? join(homedir(), 'GoogleDrive/JosepVault/Josep/01_Proyectos/04_LimpiApp');
export const vaultPrototype = join(vaultDir, 'Design', 'prototype.html');
export const repoPrototype = join(frontendDir, 'e2e', 'prototype.html');

export function prototypePath() {
  if (existsSync(vaultPrototype)) return vaultPrototype;
  if (existsSync(repoPrototype)) return repoPrototype;
  throw new Error(`Prototype not found in ${vaultPrototype} nor in ${repoPrototype}`);
}

const vars = (block) => [...block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]);

function block(html, selector) {
  const re = new RegExp(`^${selector.replace(/[[\]"]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = html.match(re);
  if (!match) throw new Error(`The prototype has no ${selector} block`);
  return match[1];
}

/** The prototype's CSS variables, in order: light (`:root`) and dark (`:root[data-theme="dark"]`). */
export function prototypeTokens(html = readFileSync(prototypePath(), 'utf8')) {
  return { light: vars(block(html, ':root')), dark: vars(block(html, ':root[data-theme="dark"]')) };
}
