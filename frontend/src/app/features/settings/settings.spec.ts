import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { SessionStore } from '../../core/session.store';
import { Settings } from './settings';

const ME = { id: 'u', email: 'a@b.c', name: 'Ana', avatarColor: 'teal', theme: 'system', households: [] };

describe('Settings', () => {
  const api = { get: vi.fn(), patch: vi.fn() };
  const household = signal({ id: 'h', name: 'Casa', role: 'owner', memberCount: 1 });
  const session = { me: signal<typeof ME | null>(ME), household, load: vi.fn(), logout: vi.fn() };

  async function render() {
    TestBed.configureTestingModule({
      imports: [Settings],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: HouseholdApi, useValue: api }, { provide: SessionStore, useValue: session }],
    });
    const fixture = TestBed.createComponent(Settings);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, http: TestBed.inject(HttpTestingController) };
  }

  beforeEach(() => {
    [api.get, api.patch, session.load, session.logout].forEach((f) => f.mockReset());
    session.me.set(ME);
    api.get.mockImplementation(async (path: string) => (path === '' ? { timeZone: 'America/Bogota' } : []));
  });

  it('adds the household zone when it is not one of the prototype ones; failing products hide the count', async () => {
    api.get.mockImplementation(async (path: string) => {
      if (path === '') return { timeZone: 'America/Bogota' };
      throw new Error('500');
    });
    const { el } = await render();
    expect([...el.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['America/Bogota', 'Europe/Madrid', 'Atlantic/Canary']);
    expect(el.querySelector('[data-testid="settings-products"] .v')).toBeNull();
  });

  it('an empty or unchanged name is not saved; same colour, theme, household name or zone neither', async () => {
    const { fixture, http, el } = await render();
    const name = el.querySelector<HTMLInputElement>('[data-testid="settings-name"]')!;
    name.value = '  ';
    name.dispatchEvent(new Event('change'));
    name.value = 'Ana';
    name.dispatchEvent(new Event('change'));
    el.querySelector<HTMLButtonElement>('[aria-label="Color teal"]')!.click();
    el.querySelector<HTMLButtonElement>('[data-testid="settings-theme"] button')!.click();
    const home = el.querySelector<HTMLInputElement>('[data-testid="settings-home-name"]')!;
    home.value = 'Casa';
    home.dispatchEvent(new Event('change'));
    const zone = el.querySelector<HTMLSelectElement>('[data-testid="settings-timezone"]')!;
    zone.value = 'America/Bogota';
    zone.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    http.expectNone('/api/me');
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('a failed household save shows the error banner', async () => {
    api.patch.mockRejectedValue(new Error('500'));
    const { fixture, el } = await render();
    const home = el.querySelector<HTMLInputElement>('[data-testid="settings-home-name"]')!;
    home.value = 'Otra';
    home.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se han podido guardar los ajustes.');
    expect(session.load).not.toHaveBeenCalled();
  });

  it('«Cerrar sesión» goes to the login even if the API fails', async () => {
    session.logout.mockRejectedValue(new Error('offline'));
    const { fixture, el } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('[data-testid="settings-logout"]')!.click();
    await fixture.whenStable().catch(() => undefined);
    await new Promise((r) => setTimeout(r));
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
