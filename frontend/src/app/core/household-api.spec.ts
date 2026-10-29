import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HouseholdApi } from './household-api';
import { SessionStore } from './session.store';

describe('HouseholdApi', () => {
  const household = signal<{ id: string } | null>({ id: 'h-casa' });

  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: SessionStore, useValue: { household } }],
    }),
  );

  it('prefixes the active household and speaks every verb', async () => {
    const api = TestBed.inject(HouseholdApi);
    const http = TestBed.inject(HttpTestingController);
    const calls = [api.get('/rooms'), api.post('/rooms', { a: 1 }), api.patch('/rooms/r', { b: 2 }), api.delete('/rooms/r')];
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
      http.expectOne((r) => r.method === method && r.url.startsWith('/api/households/h-casa/rooms')).flush({});
    }
    await Promise.all(calls);
  });

  it('fails without an active household', () => {
    household.set(null);
    expect(() => TestBed.inject(HouseholdApi).url('/rooms')).toThrow('No active household');
    household.set({ id: 'h-casa' });
  });
});
