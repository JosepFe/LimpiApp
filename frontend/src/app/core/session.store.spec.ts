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

  it('loads me, picks the first household and its «Hoy» counter', async () => {
    const loading = store.load();
    http.expectOne('/api/auth/me').flush(ME);
    await new Promise((r) => setTimeout(r));
    http.expectOne('/api/households/h-casa/today').flush({ summary: { pendingToday: 6 } });
    await loading;

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

  it('without a session stays empty', async () => {
    const loading = store.load();
    http.expectOne('/api/auth/me').flush({ title: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    await loading;

    expect(store.me()).toBeNull();
    expect(store.household()).toBeNull();
    expect(store.pendingToday()).toBe(0);
  });

  it('a user without households asks for no counter', async () => {
    const loading = store.load();
    http.expectOne('/api/auth/me').flush({ ...ME, households: [] });
    await loading;
    expect(store.household()).toBeNull();
  });
});
