import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BROWSER_PROMPT } from '../core/browser';
import { SessionStore } from '../core/session.store';
import { HomeSwitcher } from './home-switcher';

const HOUSEHOLDS = [
  { id: 'h-casa', name: 'Casa Pau y Josep', role: 'owner', memberCount: 3 },
  { id: 'h-playa', name: 'Casa de la playa', role: 'member', memberCount: 2 },
];

describe('HomeSwitcher', () => {
  const me = signal({ households: HOUSEHOLDS });
  const session = {
    me,
    household: computed(() => me().households[0]),
    selectHousehold: vi.fn(),
    load: vi.fn(() => Promise.resolve(true)),
  };
  const prompt = vi.fn();

  function render() {
    session.selectHousehold.mockReset();
    TestBed.configureTestingModule({
      imports: [HomeSwitcher],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SessionStore, useValue: session },
        { provide: BROWSER_PROMPT, useValue: prompt },
      ],
    });
    const fixture = TestBed.createComponent(HomeSwitcher);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const navigateTo = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, closed, navigate, navigateTo, q: (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`) };
  }

  it('lists the households with avatar colour, members and role; the active one is checked', () => {
    const { el } = render();
    const rows = el.querySelectorAll('[data-testid="home-row"]');
    expect(rows[0].textContent).toContain('3 miembros · Propietario');
    expect(rows[0].classList).toContain('sel');
    expect(rows[0].querySelector('.avatar')?.className).toContain('teal');
    expect(rows[1].textContent).toContain('2 miembros · Miembro');
    expect(rows[1].querySelector('.avatar')?.className).toContain('violet');
  });

  it('choosing a household selects it, closes and opens Hoy', async () => {
    const { el, closed, navigate } = render();
    el.querySelectorAll<HTMLButtonElement>('[data-testid="home-row"]')[1].click();
    await Promise.resolve();
    expect(session.selectHousehold).toHaveBeenCalledWith('h-playa');
    expect(closed).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/today');
  });

  it('a new household needs a name, then is created and chosen', async () => {
    const { fixture, q } = render();
    q('home-create')!.click();
    fixture.detectChanges();
    q('home-create-submit')!.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('El nombre es obligatorio.');

    const input = q('home-name') as HTMLInputElement;
    input.value = 'Casa del pueblo';
    input.dispatchEvent(new Event('input'));
    q('home-create-submit')!.click();
    TestBed.inject(HttpTestingController).expectOne('/api/households').flush({ id: 'h-pueblo' });
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    expect(session.load).toHaveBeenCalled();
    expect(session.selectHousehold).toHaveBeenCalledWith('h-pueblo');
  });

  it('«Unirme con enlace» opens /join/<code> from a pasted link or code', async () => {
    const { q, navigateTo } = render();
    prompt.mockReturnValueOnce('https://limpiapp.taaloss.com/join/k3Jx9QmZ2vLpA8?x=1');
    q('home-join')!.click();
    await Promise.resolve();
    expect(navigateTo).toHaveBeenCalledWith(['/join', 'k3Jx9QmZ2vLpA8']);

    prompt.mockReturnValueOnce(null);
    q('home-join')!.click();
    await Promise.resolve();
    expect(navigateTo).toHaveBeenCalledTimes(1);
  });
});
