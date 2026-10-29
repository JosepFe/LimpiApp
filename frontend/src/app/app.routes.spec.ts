import { isDevMode } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { routes } from './app.routes';

describe('routes', () => {
  const children = routes.find((r) => r.component)?.children ?? [];

  it('opens Hoy by default and sends unknown paths home', () => {
    expect(children[0]).toMatchObject({ path: '', redirectTo: 'today' });
    expect(routes.at(-1)).toMatchObject({ path: '**', redirectTo: '' });
  });

  it('has a screen for every section of the navigation', () => {
    const paths = children.map((r) => r.path);
    for (const p of ['today', 'rooms', 'history', 'stats', 'ranking', 'members', 'settings', 'products', 'ui-kit']) {
      expect(paths).toContain(p);
    }
  });

  it('the login lives outside the shell and loads lazily', async () => {
    const login = routes.find((r) => r.path === 'login')!;
    expect(login.component).toBeUndefined();
    expect(await (login.loadComponent as () => Promise<unknown>)()).toBeTruthy();
  });

  it('serves the UI kit only in development and loads it lazily', async () => {
    const kit = children.find((r) => r.path === 'ui-kit')!;
    const canMatch = kit.canMatch![0] as () => boolean;
    expect(TestBed.runInInjectionContext(canMatch)).toBe(isDevMode());
    const component = await (kit.loadComponent as () => Promise<unknown>)();
    expect(component).toBeTruthy();
  });
});
