// E01/US-004 · criterion 2: the parity helper detects a different text, a missing data-testid and another order.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collect, compareParity, expectParity, prototypeUrl, roots } from './parity';

const html = (name: string) => readFileSync(join(__dirname, 'fixtures', `${name}.html`), 'utf8');

async function differences(page: import('@playwright/test').Page, expectedName: string, actualName: string) {
  await page.setContent(html(expectedName));
  const expected = await collect(page, '#screen-demo');
  await page.setContent(html(actualName));
  const actual = await collect(page, '[data-screen="screen-demo"]');
  return compareParity(expected, actual);
}

test('identical screens pass and hidden elements are ignored', async ({ page }) => {
  expect(await differences(page, 'base', 'base')).toEqual([]);
  await page.setContent(html('base'));
  const ids = (await collect(page, '#screen-demo')).map((e) => e.id);
  expect(ids).not.toContain('demo-oculto');
  expect(ids).toContain('demo-campo');
});

test('a different text fails with both texts', async ({ page }) => {
  const problems = await differences(page, 'base', 'texto');
  expect(problems.join('\n')).toContain('expected «Comprar queso» but found «Comprar pan»');
});

test('a missing data-testid fails', async ({ page }) => {
  const problems = await differences(page, 'base', 'falta');
  expect(problems.join('\n')).toContain('missing «demo-area»');
});

test('a different order fails', async ({ page }) => {
  const problems = await differences(page, 'base', 'orden');
  expect(problems[0]).toContain('expected «demo-titulo» but found «demo-campo»');
});

test('form fields compare what the user sees: input value, textarea once, the selected option label', async ({ page }) => {
  await page.setContent(html('base'));
  const entries = await collect(page, '#screen-demo');
  const text = (id: string) => entries.find((e) => e.id === id)?.text;
  expect(text('demo-campo')).toBe('31/10/2026');
  expect(text('demo-notas')).toBe('Gotea la cocina');
  expect(text('demo-area')).toBe('Casa');
  // as in Angular: a textarea filled by property (no text node) gives the same
  await page.evaluate(() => {
    const area = document.querySelector('textarea')!;
    area.textContent = '';
    area.value = 'Gotea la cocina';
  });
  expect((await collect(page, '[data-testid="demo-notas"]'))[0].text).toBe('Gotea la cocina');
});

test('expectParity works against the real prototype (the Today filters compared with themselves)', async ({ page }) => {
  await page.goto(prototypeUrl('today'));
  await expectParity(page, { screen: 'today', scope: 'today-filters' });
  const filters = await collect(page, '[data-testid="today-filters"]');
  expect(filters.map((e) => e.id)).toEqual(['today-filters', 'filter-all', 'filter-mine', 'filter-room', 'filter-time']);
});

test('with a scope and a state, the visible copy of a repeated element is the one compared', async ({ page }) => {
  // «complete-points» shows «+9 pts» by default and «+5 pts» with 3 of 5 subtasks (state partial)
  const points = async (state?: string) => {
    await page.goto(prototypeUrl('complete', state));
    const [root] = await collect(page, roots({ screen: 'complete', scope: 'complete-points' }).proto);
    return root;
  };
  expect(await points()).toEqual({ id: 'complete-points', text: '+9 pts' });
  expect(await points('partial')).toEqual({ id: 'complete-points', text: '+5 pts' });
});

test('the dark theme of the prototype can be opened', async ({ page }) => {
  await page.goto(prototypeUrl('ui-kit', undefined, 'dark'));
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
});

test('a scope that is not visible anywhere is reported instead of comparing nothing', async ({ page }) => {
  await page.setContent(html('base'));
  const [entry] = await collect(page, '[data-testid="demo-oculto"]');
  expect(entry.id).toContain('no visible scope');
});

test('the app side looks inside [data-screen] and waits for Angular to render', async ({ page }) => {
  await page.goto(prototypeUrl('today'));
  const filters = await page.locator('[data-testid="today-filters"]').evaluate((el) => el.outerHTML);
  await page.setContent('<body></body>');
  // inside an app screen ([data-screen]) and with a hidden decoy outside, which must not be picked
  const app = `<div data-testid="today-filters" hidden></div><main data-screen="screen-today">${filters}</main>`;
  setTimeout(() => void page.evaluate((h) => (document.body.innerHTML = h), app), 300);
  await expectParity(page, { screen: 'today', scope: 'today-filters' });
});

test('with all, every visible match of the scope is compared in order', async ({ page }) => {
  await page.setContent(html('base'));
  const first = await collect(page, '[data-testid="demo-item"]');
  const every = await collect(page, '[data-testid="demo-item"]', true);
  expect(first.map((e) => e.text)).toEqual(['Llamar al fontanero']);
  expect(every.map((e) => e.text)).toEqual(['Llamar al fontanero', 'Comprar queso']);
});
