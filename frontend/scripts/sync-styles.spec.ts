// E01/US-006: the app CSS is the prototype's minus the token blocks and the demo chrome; the sprite keeps every icon.
import { readFileSync } from 'node:fs';
import { appCss, sprite } from './sync-styles.mjs';
import { prototypePath } from './prototype.mjs';

describe('sync-styles', () => {
  it('drops tokens, comments and demo chrome, also inside @media', () => {
    const css = `/* c */ :root{--a:1} :root[data-theme="dark"]{--a:2} .btn{color:red}
      .demo-bar{x:1} body.bare .demo-bar{display:none} body:not(.bare) .page-header{top:36px}
      @media (min-width:1024px){ .side{display:block} body:not(.bare) .pane{top:1px} }
      @media print{ .demo-bar{x:1} }`;
    expect(appCss(css)).toBe('.btn{color:red}\n@media (min-width:1024px){\n  .side{display:block}\n}');
  });

  it('the generated files match the current prototype', () => {
    const html = readFileSync(prototypePath(), 'utf8');
    const style = html.match(/<style>([\s\S]*?)<\/style>/)![1];
    const css = readFileSync(new URL('../src/styles/prototype.css', import.meta.url), 'utf8');
    expect(css.slice(css.indexOf('\n') + 1)).toBe(appCss(style) + '\n');
    expect(readFileSync(new URL('../public/icons.svg', import.meta.url), 'utf8')).toBe(sprite(html));
    expect(sprite(html).match(/<symbol/g)).toHaveLength(27);
  });
});
