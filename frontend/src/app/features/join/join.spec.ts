import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionStore } from '../../core/session.store';
import { ToastService } from '../../core/toast';
import { Join } from './join';

const PREVIEW = { status: 'valid', householdId: 'h-casa', householdName: 'Casa Pau y Josep', inviterName: 'Pau', members: [{ name: 'Pau', avatarColor: 'violet' }], memberCount: 1, roomCount: 1 };

describe('Join', () => {
  const toast = { show: vi.fn() };
  const session = {
    me: signal<{ households: { id: string }[] } | null>({ households: [] }),
    ensureLoaded: vi.fn(),
    load: vi.fn(),
    selectHousehold: vi.fn(),
  };

  async function render(code = 'abc') {
    TestBed.configureTestingModule({
      imports: [Join],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: SessionStore, useValue: session }, { provide: ToastService, useValue: toast }],
    });
    const fixture = TestBed.createComponent(Join);
    fixture.componentRef.setInput('code', code);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    return { fixture, http, el: fixture.nativeElement as HTMLElement };
  }

  async function settle(fixture: { whenStable(): Promise<unknown>; detectChanges(): void }) {
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    [toast.show, session.ensureLoaded, session.load, session.selectHousehold].forEach((f) => f.mockReset());
    session.ensureLoaded.mockResolvedValue(true);
    session.me.set({ households: [] });
    localStorage.clear();
  });

  it('«1 miembro · 1 habitación» in singular', async () => {
    const { fixture, http, el } = await render();
    http.expectOne('/api/invites/abc').flush(PREVIEW);
    await settle(fixture);
    expect(el.textContent).toContain('1 miembro · 1 habitación');
  });

  it('a pending code older than 30 minutes does not join by itself', async () => {
    localStorage.setItem('limpiapp.join', JSON.stringify({ code: 'abc', at: Date.now() - 31 * 60 * 1000 }));
    const { fixture, http } = await render();
    http.expectOne('/api/invites/abc').flush(PREVIEW);
    await settle(fixture);
    http.expectNone('/api/invites/abc/accept');
    expect(localStorage.getItem('limpiapp.join')).toBeNull();
  });

  it('a pending code of this link joins once signed in', async () => {
    localStorage.setItem('limpiapp.join', JSON.stringify({ code: 'abc', at: Date.now() }));
    const { fixture, http } = await render();
    http.expectOne('/api/invites/abc').flush(PREVIEW);
    await settle(fixture);
    http.expectOne('/api/invites/abc/accept').flush({ status: 'joined', householdId: 'h-casa' });
    await settle(fixture);
    expect(session.selectHousehold).toHaveBeenCalledWith('h-casa');
    expect(toast.show).toHaveBeenCalledWith('Te has unido al hogar');
  });

  it('accepting when already a member shows «Ya eres miembro»; a network failure only a toast', async () => {
    const { fixture, http, el } = await render();
    http.expectOne('/api/invites/abc').flush(PREVIEW);
    await settle(fixture);

    el.querySelector<HTMLButtonElement>('[data-testid="join-accept"]')!.click();
    http.expectOne('/api/invites/abc/accept').flush({ status: 'already-member', householdId: 'h-casa' }, { status: 409, statusText: 'Conflict' });
    await settle(fixture);
    expect(el.querySelector('[data-testid="join-already"]')?.textContent).toContain('Ya formas parte de Casa Pau y Josep.');

    fixture.componentInstance['invite'].set(PREVIEW as never);
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="join-accept"]')!.click();
    http.expectOne('/api/invites/abc/accept').error(new ProgressEvent('offline'));
    await settle(fixture);
    expect(toast.show).toHaveBeenCalledWith('No hemos podido unirte al hogar. Inténtalo de nuevo.');
    expect(el.querySelector('[data-testid="join-valid"]')).not.toBeNull();
  });

  it('«Ir a Hoy» selects the household of the invite when I am in it', async () => {
    session.me.set({ households: [{ id: 'h-casa' }] });
    const { fixture, http, el } = await render();
    http.expectOne('/api/invites/abc').flush({ ...PREVIEW, status: 'already-member' });
    await settle(fixture);
    el.querySelector<HTMLButtonElement>('[data-testid="join-already"] button')!.click();
    await settle(fixture);
    expect(session.selectHousehold).toHaveBeenCalledWith('h-casa');
  });
});
