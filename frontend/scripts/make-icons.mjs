// Draws the app icons (public/icons/*.png) and the browser tab icon (public/favicon.svg and favicon.ico) with
// Playwright's Chromium: the prototype's logo-mark, a green square (--primary #2D7D46) with white sparkles.
// Run `node scripts/make-icons.mjs` after changing the drawing; the files are committed.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const star = (cx, cy, r) => `M${cx} ${cy - r} C${cx + r * 0.18} ${cy - r * 0.18} ${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy}` +
  ` C${cx + r * 0.18} ${cy + r * 0.18} ${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r}` +
  ` C${cx - r * 0.18} ${cy + r * 0.18} ${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy}` +
  ` C${cx - r * 0.18} ${cy - r * 0.18} ${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r}Z`;

/** `scale` < 1 keeps the sparkles inside the maskable safe zone (the inner 80 %); `radius` rounds the tab icon. */
const svg = (scale, radius = 0) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <rect width="100" height="100" rx="${radius}" fill="#2D7D46"/>
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
// The tab icon: rounded like the prototype's logo-mark (18 px of 64), sparkles a bit bigger to read at 16 px.
const tab = svg(1.1, 28).replace(' width="100%" height="100%"', '');
writeFileSync(join(out, '..', 'favicon.svg'), `${tab}\n`);
const page = await browser.newPage({ viewport: { width: 32, height: 32 } });
await page.setContent(`<html><body style="margin:0;background:transparent">${svg(1.1, 28)}</body></html>`);
const png32 = join(out, 'favicon-32.png');
await page.screenshot({ path: png32, omitBackground: true });
await browser.close();
writeFileSync(join(out, '..', 'favicon.ico'), ico(readFileSync(png32)));
unlinkSync(png32);
console.log(`Icons written to ${out} and the tab icon to public/favicon.{svg,ico}`);

/** A one-image .ico that holds a 32×32 PNG (valid since Windows Vista; every browser reads it). */
function ico(png) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(32, 6); // width
  header.writeUInt8(32, 7); // height
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18); // the PNG starts after this header
  return Buffer.concat([header, png]);
}
