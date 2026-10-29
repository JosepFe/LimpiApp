/** Set by the production build (`ng build --define LIMPIAPP_BUILD="'2026.10.29'"`, see the Dockerfile). */
declare const LIMPIAPP_BUILD: string | undefined;

/** Same as package.json (checked by scripts/build-info.spec.ts). */
export const VERSION = '0.1.0';

/** «LimpiApp 0.1.0 · build 2026.10.14». Without a build id (ng serve, tests), the day it runs. */
export function versionLine(now = new Date()): string {
  const build = typeof LIMPIAPP_BUILD === 'string' ? LIMPIAPP_BUILD : now.toISOString().slice(0, 10).replaceAll('-', '.');
  return `LimpiApp ${VERSION} · build ${build}`;
}
