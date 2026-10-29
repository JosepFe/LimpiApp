import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Me, SessionStore } from './session.store';

const ME: Me = {
  id: 'u-josep',
  email: 'josep@example.com',
  name: 'Josep',
  avatarColor: 'teal',
  theme: 'system',
  households: [
    { id: 'h-casa', name: 'Casa Pau y Josep', role: 'owner', memberCount: 3 },
    { id: 'h-playa', name: 'Casa de la playa', role: 'member', memberCount: 2 },
  ],
};

describe('SessionStore', () => {
  let http: HttpTestingController;
  let store: SessionStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
  });

  afterEach(() => http.verify());

  it('loads me, picks the first household and its «Hoy» counter, without waiting for the counter', async () => {
    const loading = store.load();
    http.expectOne('/api/auth/me').flush(ME);
    expect(await loading).toBe(true); // the counter request is still pending
    http.expectOne('/api/households/h-casa/today').flush({ summary: { pendingToday: 6 } });
    await new Promise((r) => setTimeout(r));

    expect(store.me()?.name).toBe('Josep');
    expect(store.household()?.name).toBe('Casa Pau y Josep');
    expect(store.pendingToday()).toBe(6);
  });

  it('selecting another household remembers it and reloads the counter', async () => {
    const loading = store.load();
    http.expectOne('/api/auth/me').flush(ME);
    await new Promise((r) => setTimeout(r));
    http.expectOne('/api/households/h-casa/today').flush({ summary: { pendingToday: 6 } });
    await loading;

    store.selectHousehold('h-playa');
    await new Promise((r) => setTimeout(r));
    http.expectOne('/api/households/h-playa/today').flush({ summary: { pendingToday: 2 } });
    await new Promise((r) => setTimeout(r));

    expect(store.household()?.name).toBe('Casa de la playa');
    expect(store.pendingToday()).toBe(2);
    expect(localStorage.getItem('limpiapp.household')).toBe('h-playa');
  });

  it('a failing counter keeps the session and hides the badge, also when switching household', async () => {
    const loading = store.load();
    http.expectOne('/api/auth/me').flush(ME);
    await new Promise((r) => setTimeout(r));
    http.expectOne('/api/households/h-casa/today').flush(null, { status: 500, statusText: 'Server Error' });
    await loading;
    expect(store.household()?.name).toBe('Casa Pau y Josep');
    expect(store.pendingToday()).toBe(0);

    store.selectHousehold('h-playa');
    await new Promise((r) => setTimeout(r));
    http.expectOne('/api/households/h-playa/today').flush(null, { status: 500, statusText: 'Server Error' });
    await new Promise((r) => setTimeout(r));
    expect(store.me()?.name).toBe('Josep');
    expect(store.pendingToday()).toBe(0);
  });

  it('without a session stays empty', async () => {
    const loading = store.load();
    http.expectOne('/api/auth/me').flush({ title: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(await loading).toBe(false);
    expect(store.me()).toBeNull();
    expect(store.household()).toBeNull();
    expect(store.pendingToday()).toBe(0);
  });

  it('ensureLoaded asks /auth/me once for callers at the same time, and not again once signed in', async () => {
    const a = store.ensureLoaded();
    const b = store.ensureLoaded();
    http.expectOne('/api/auth/me').flush({ ...ME, households: [] });
    expect(await Promise.all([a, b])).toEqual([true, true]);
    expect(await store.ensureLoaded()).toBe(true);
    http.expectNone('/api/auth/me');
  });

  it('logout signs out in the API and forgets the user', async () => {
    store.me.set(ME);
    store.pendingToday.set(6);
    const out = store.logout();
    http.expectOne({ method: 'POST', url: '/api/auth/logout' }).flush(null, { status: 204, statusText: 'No Content' });
    await out;
    expect(store.me()).toBeNull();
    expect(store.pendingToday()).toBe(0);
  });

  it('a user without households asks for no counter', async () => {
    const loading = store.load();
    http.expectOne('/api/auth/me').flush({ ...ME, households: [] });
    await loading;
    expect(store.household()).toBeNull();
  });
});
