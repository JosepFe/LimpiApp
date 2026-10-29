import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard, householdGuard } from './guards';
import { SessionStore } from './session.store';

describe('guards', () => {
  const session = { household: signal<object | null>(null), ensureLoaded: vi.fn() };
  const run = (guard: typeof authGuard, url = '/rooms') =>
    TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));
  const serialize = (tree: unknown) => TestBed.inject(Router).serializeUrl(tree as UrlTree);

  beforeEach(() => {
    session.household.set(null);
    session.ensureLoaded.mockReset();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: SessionStore, useValue: session }] });
  });

  it('authGuard lets a signed-in user through', async () => {
    session.ensureLoaded.mockResolvedValue(true);
    expect(await run(authGuard)).toBe(true);
  });

  it('authGuard sends a visitor to the login with the return url', async () => {
    session.ensureLoaded.mockResolvedValue(false);
    expect(serialize(await run(authGuard, '/rooms'))).toBe('/login?return=%2Frooms');
  });

  it('householdGuard sends a user without households to the onboarding', async () => {
    session.ensureLoaded.mockResolvedValue(true);
    expect(serialize(await run(householdGuard))).toBe('/onboarding');
    session.household.set({ id: 'h' });
    expect(await run(householdGuard)).toBe(true);
  });

  it('householdGuard leaves visitors to authGuard', async () => {
    session.ensureLoaded.mockResolvedValue(false);
    expect(await run(householdGuard)).toBe(true);
  });
});
