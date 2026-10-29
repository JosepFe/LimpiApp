// Medium parity (E01 D4): the app has the same visible data-testids as the prototype, in the same order and with
// the same text. No pixel comparison. Usage: await expectParity(page, { screen: 'today', state: 'empty' }).
import { expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

export interface Entry {
  id: string;
  text: string;
}

export interface ParityOptions {
  /** Prototype screen without the prefix: 'today' → #screen-today. */
  screen: string;
  /** Prototype state (?state=…); without it, the default one. */
  state?: string;
  /** data-testid of the scope to compare (e.g. 'today-filters'); without it, the whole screen. */
  scope?: string;
  /** With `scope`: every visible match in a row (e.g. each `task-row`), not only the first one. */
  all?: boolean;
  /** Prototype theme (?theme=dark). */
  theme?: 'dark';
}

export const prototypeUrl = (screen: string, state?: string, theme?: 'dark') =>
  `${pathToFileURL(join(__dirname, '..', 'prototype.html')).href}?bare${state ? `&state=${state}` : ''}${theme ? `&theme=${theme}` : ''}#screen-${screen}`;

/**
 * Visible data-testids inside the scope (itself included), in document order, with their normalised text.
 * `root` is a selector or a list by preference: the scope is the first VISIBLE match of the first selector that has
 * one (the prototype repeats the same data-testid in each state and hides the ones that do not apply).
 */
export async function collect(page: Page, root: string | string[], all = false): Promise<Entry[]> {
  return page.evaluate(([selectors, every]) => {
    const visible = (el: Element) => {
      const style = getComputedStyle(el);
      return el.getClientRects().length > 0 && style.visibility !== 'hidden';
    };
    let scopes: Element[] = [];
    for (const selector of selectors) {
      scopes = [...document.querySelectorAll(selector)].filter(visible);
      if (scopes.length) break;
    }
    if (!scopes.length) return [{ id: `(no visible scope: ${selectors.join(' | ')})`, text: '' }];
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    const nodes = (every ? scopes : scopes.slice(0, 1))
      .flatMap((scope) => [scope, ...scope.querySelectorAll('[data-testid]')])
      .filter((el) => el.hasAttribute('data-testid'));
    return nodes.filter(visible).map((el) => {
      // fields: what the user sees typed or chosen (in a select, the option text, not its value)
      const field = el as HTMLInputElement;
      const value =
        el instanceof HTMLSelectElement
          ? (el.selectedOptions[0]?.textContent ?? '')
          : el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
            ? el.value
            : '';
      // visible text nodes joined by a space: the same with or without styles (layout, text-transform)
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const parts: string[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (parent && visible(parent) && !['SCRIPT', 'STYLE', 'OPTION', 'TEXTAREA'].includes(parent.tagName)) parts.push(node.textContent ?? '');
      }
      const text = norm([...parts, value, field.placeholder ?? ''].filter(Boolean).join(' '));
      return { id: el.getAttribute('data-testid') ?? '', text };
    });
  }, [Array.isArray(root) ? root : [root], all] as const);
}

/** Readable differences between what the prototype asks for and what the app has (empty = equal). */
export function compareParity(expected: Entry[], actual: Entry[]): string[] {
  const problems: string[] = [];
  const max = Math.max(expected.length, actual.length);
  for (let i = 0; i < max; i++) {
    const e = expected[i];
    const a = actual[i];
    if (!a) problems.push(`#${i + 1} missing «${e.id}» («${e.text}»)`);
    else if (!e) problems.push(`#${i + 1} extra «${a.id}» («${a.text}»)`);
    else if (e.id !== a.id) problems.push(`#${i + 1} expected «${e.id}» but found «${a.id}»`);
    else if (e.text !== a.text) problems.push(`#${i + 1} «${e.id}»: expected «${e.text}» but found «${a.text}»`);
    if (problems.length >= 15) {
      problems.push('…');
      break;
    }
  }
  return problems;
}

/**
 * Scope in the prototype and in the app. Contract for the app screens: their root element carries
 * `data-screen="screen-<id>"`, the same id as the prototype section (#screen-<id>).
 * With `scope`, first inside the screen and, if not visible there, outside (the navigation belongs to the shell).
 */
export const roots = ({ screen, scope }: ParityOptions) => {
  const testid = `[data-testid="${scope}"]`;
  return scope
    ? { proto: [`#screen-${screen} ${testid}`, testid], app: [`[data-screen="screen-${screen}"] ${testid}`, testid] }
    : { proto: [`#screen-${screen}`], app: [`[data-screen="screen-${screen}"]`] };
};

/** Compares the open app page with the prototype screen; waits for Angular to finish rendering. */
export async function expectParity(page: Page, options: ParityOptions): Promise<void> {
  const proto = await page.context().newPage();
  await proto.goto(prototypeUrl(options.screen, options.state, options.theme));
  const { proto: protoRoot, app: appRoot } = roots(options);
  const expected = await collect(proto, protoRoot, options.all);
  await proto.close();
  const label = `${options.screen}${options.state ? `?state=${options.state}` : ''}${options.scope ? ` [${options.scope}${options.all ? ' ×todas' : ''}]` : ''}`;
  await expect
    .poll(async () => compareParity(expected, await collect(page, appRoot, options.all)), { message: `parity with the prototype in ${label}` })
    .toEqual([]);
}

/**
 * Like expectParity, for a region that has no data-testid of its own (the shell navigation): `region` is a CSS
 * selector looked up in the prototype screen page and in the app page.
 */
export async function expectRegionParity(page: Page, options: { screen: string; region: string }): Promise<void> {
  const proto = await page.context().newPage();
  await proto.goto(prototypeUrl(options.screen));
  const expected = await collect(proto, options.region, true);
  await proto.close();
  await expect
    .poll(async () => compareParity(expected, await collect(page, options.region, true)), {
      message: `parity with the prototype in ${options.screen} [${options.region}]`,
    })
    .toEqual([]);
}
