// E01/US-003 · criterion 2: the compiled tokens are exactly the prototype's, for the light (:root) and dark themes.
import { compile } from 'sass';
import { fileURLToPath } from 'node:url';
import { prototypeTokens } from '../../scripts/prototype.mjs';

const css = compile(fileURLToPath(new URL('./_tokens.scss', import.meta.url))).css;
const varsOf = (selector: string): [string, string][] => {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('}', start));
  return [...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]);
};
const norm = (value: string) => value.replace(/\s+/g, ' ').replace(/,\s*/g, ',').toLowerCase();
const expected = prototypeTokens();

describe('design tokens', () => {
  it('expose the light :root variables of the prototype with the same values', () => {
    const actual = varsOf(':root');
    expect(actual.map(([n]) => n)).toEqual(expected.light.map(([n]) => n));
    expect(actual.map(([, v]) => norm(v))).toEqual(expected.light.map(([, v]) => norm(v)));
  });

  it('expose the dark variables of the prototype with the same values', () => {
    const actual = varsOf(":root[data-theme=dark]");
    expect(actual.map(([n]) => n)).toEqual(expected.dark.map(([n]) => n));
    expect(actual.map(([, v]) => norm(v))).toEqual(expected.dark.map(([, v]) => norm(v)));
  });

  it('include the key colours of the visual contract', () => {
    const light = Object.fromEntries(varsOf(':root'));
    expect(light['--primary']).toBe('#2D7D46');
    expect(light['--bg']).toBe('#FAFAFA');
    expect(light['--r-pill']).toBe('24px');
    expect(Object.fromEntries(varsOf(':root[data-theme=dark]'))['--bg']).toBe('#121212');
  });
});
