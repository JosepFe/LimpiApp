import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { History } from './history';

const item = (id: string, on: string, extra = {}) => ({
  id, at: `${on}T10:00:00Z`, on, by: { id: 'u', name: 'Josep', avatarColor: 'teal' }, taskId: 't', taskTitle: 'Fregar suelo', roomName: 'Cocina', roomEmoji: '🍳',
  minutes: 20, points: 6, note: null, photoCount: 0, undone: false, ...extra,
});
const page = (items: unknown[], nextCursor: string | null = null) => ({ today: '2026-10-14', items, nextCursor, rooms: [] });

describe('History', () => {
  const api = { get: vi.fn() };

  async function render() {
    TestBed.configureTestingModule({ imports: [History], providers: [provideRouter([{ path: 'history', component: History }]), { provide: HouseholdApi, useValue: api }] });
    await TestBed.inject(Router).navigateByUrl('/history');
    const fixture = TestBed.createComponent(History);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, router: TestBed.inject(Router) };
  }

  beforeEach(() => api.get.mockReset());

  it('loads, groups by day, marks undone entries and loads more with the cursor', async () => {
    api.get.mockResolvedValueOnce(page([item('a', '2026-10-14'), item('b', '2026-10-13', { undone: true, note: 'Ojo', photoCount: 2 })], 'c1'))
      .mockResolvedValueOnce(page([item('c', '2026-10-12')]));
    const { fixture, el } = await render();
    expect([...el.querySelectorAll('.day-h')].map((d) => d.textContent)).toEqual(['Hoy · mié 14 oct', 'Ayer · mar 13 oct']);
    expect(el.querySelectorAll('[data-testid="history-row"]')[1].textContent).toContain('Deshecha');
    expect(el.textContent).toContain('“Ojo”');

    el.querySelector<HTMLButtonElement>('[data-testid="history-load-more"]')!.click();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    expect(api.get).toHaveBeenLastCalledWith('/history?cursor=c1');
    expect(el.querySelectorAll('[data-testid="history-row"]')).toHaveLength(3);
    expect(el.querySelector('[data-testid="history-load-more"]')).toBeNull();
  });

  it('a page of «Cargar más» that arrives after a reload is dropped; a failure is said in a toast', async () => {
    let release!: (v: unknown) => void;
    api.get.mockResolvedValueOnce(page([item('a', '2026-10-14')], 'c1'))
      .mockReturnValueOnce(new Promise((r) => (release = r)))
      .mockResolvedValueOnce(page([item('z', '2026-10-14')], 'c2'))
      .mockRejectedValueOnce(new Error('x'));
    const { fixture, el } = await render();
    el.querySelector<HTMLButtonElement>('[data-testid="history-load-more"]')!.click();
    await (fixture.componentInstance as unknown as { load: () => Promise<void> }).load(); // e.g. an undo refreshed the list
    release(page([item('old', '2026-10-01')]));
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    expect([...el.querySelectorAll('[data-testid="history-row"]')].map((r) => r.textContent?.includes('Fregar'))).toHaveLength(1);

    el.querySelector<HTMLButtonElement>('[data-testid="history-load-more"]')!.click();
    await new Promise((r) => setTimeout(r));
    const { ToastService } = await import('../../core/toast');
    expect(TestBed.inject(ToastService).current()?.text).toBe('No hemos podido cargar más actividad.');
  });

  it('filters, clears and opens an entry through the URL; a failed load shows the error', async () => {
    api.get.mockResolvedValue(page([item('a', '2026-10-14')]));
    const { fixture, el, router } = await render();
    const navigate = vi.spyOn(router, 'navigate');
    const who = el.querySelector<HTMLSelectElement>('[aria-label="Quién"]')!;
    who.value = '1';
    who.dispatchEvent(new Event('change'));
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { mine: '1' } }));
    el.querySelector<HTMLElement>('[data-testid="history-row"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { sheet: 'history-entry', entry: 'a' } }));

    api.get.mockResolvedValueOnce(page([]));
    await router.navigateByUrl('/history?mine=1');
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="history-no-results"]')).not.toBeNull();
    el.querySelector<HTMLButtonElement>('[data-testid="history-no-results"] button')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { mine: null, room: null } }));

    api.get.mockRejectedValueOnce(new Error('x'));
    await (fixture.componentInstance as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="history-error"]')).not.toBeNull();
  });
});
