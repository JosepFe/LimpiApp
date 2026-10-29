// E07/US-002 · criterion 3: the app is installable (manifest with name, standalone, theme colour and icons; no
// service worker, D1).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'public', 'manifest.webmanifest'), 'utf8')) as {
  name: string;
  short_name: string;
  display: string;
  start_url: string;
  theme_color: string;
  icons: { src: string; sizes: string; purpose: string }[];
};

/** Width and height from the PNG header (IHDR). */
function pngSize(path: string): string {
  const png = readFileSync(path);
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
}

describe('manifest.webmanifest', () => {
  it('has the name, standalone display, start URL and the prototype green', () => {
    expect(manifest).toMatchObject({ name: 'LimpiApp', short_name: 'LimpiApp', display: 'standalone', start_url: '/today', theme_color: '#2D7D46' });
  });

  it('has 192 and 512 icons and a maskable one, whose files exist with those sizes', () => {
    expect(manifest.icons.map((i) => `${i.sizes} ${i.purpose}`)).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);
    for (const icon of manifest.icons) {
      const file = join(root, 'public', icon.src);
      expect(existsSync(file)).toBe(true);
      expect(pngSize(file)).toBe(icon.sizes);
    }
  });

  it('the tab icon: an SVG with the prototype green and a 32×32 .ico for older browsers, both linked', () => {
    const index = readFileSync(join(root, 'src', 'index.html'), 'utf8');
    expect(index).toContain('<link rel="icon" href="favicon.svg" type="image/svg+xml">');
    expect(index).toContain('<link rel="icon" href="favicon.ico" sizes="32x32">');
    expect(readFileSync(join(root, 'public', 'favicon.svg'), 'utf8')).toMatch(/^<svg [^>]*viewBox="0 0 100 100"[\s\S]*fill="#2D7D46"/);
    const ico = readFileSync(join(root, 'public', 'favicon.ico'));
    expect([ico.readUInt16LE(2), ico.readUInt16LE(4), ico[6], ico[7]]).toEqual([1, 1, 32, 32]); // icon, one image, 32×32
    expect(ico.subarray(22, 26).toString('latin1')).toBe('\x89PNG');
  });

  it('index.html links it, with the theme colour and the iOS icon; there is no service worker', () => {
    const index = readFileSync(join(root, 'src', 'index.html'), 'utf8');
    expect(index).toContain('<link rel="manifest" href="manifest.webmanifest">');
    expect(index).toContain('<meta name="theme-color" content="#2D7D46">');
    expect(pngSize(join(root, 'public', 'icons', 'apple-touch-icon.png'))).toBe('180x180');
    expect(existsSync(join(root, 'public', 'ngsw-config.json'))).toBe(false);
    expect(readFileSync(join(root, 'angular.json'), 'utf8')).not.toContain('serviceWorker');
  });
});
