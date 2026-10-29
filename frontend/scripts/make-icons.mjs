// Draws the app icons (public/icons/*.png) with Playwright's Chromium: the prototype's logo-mark, a green square
// (--primary #2D7D46) with white sparkles. Run `node scripts/make-icons.mjs` after changing the drawing; the PNGs are committed.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const star = (cx, cy, r) => `M${cx} ${cy - r} C${cx + r * 0.18} ${cy - r * 0.18} ${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy}` +
  ` C${cx + r * 0.18} ${cy + r * 0.18} ${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r}` +
  ` C${cx - r * 0.18} ${cy + r * 0.18} ${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy}` +
  ` C${cx - r * 0.18} ${cy - r * 0.18} ${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r}Z`;

/** `scale` < 1 keeps the sparkles inside the maskable safe zone (the inner 80 %). */
const svg = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <rect width="100" height="100" fill="#2D7D46"/>
  <g fill="#FFFFFF" transform="translate(50 50) scale(${scale}) translate(-50 -50)">
    <path d="${star(44, 54, 26)}"/><path d="${star(70, 28, 12)}"/><path d="${star(72, 72, 8)}"/>
  </g></svg>`;

const icons = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.72],
  ['apple-touch-icon.png', 180, 0.9],
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [name, size, scale] of icons) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0">${svg(scale)}</body></html>`);
  await page.screenshot({ path: join(out, name), omitBackground: false });
  await page.close();
}
await browser.close();
console.log(`Icons written to ${out}`);
