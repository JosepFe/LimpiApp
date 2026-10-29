import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { RefreshBus } from '../../core/refresh-bus';
import { Rooms } from './rooms';
import { plural } from './rooms.model';

describe('Rooms', () => {
  const api = { get: vi.fn() };

  async function render() {
    TestBed.configureTestingModule({ imports: [Rooms], providers: [provideRouter([]), { provide: HouseholdApi, useValue: api }] });
    const fixture = TestBed.createComponent(Rooms);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('a household without tasks has no health yet, in singular', async () => {
    api.get.mockResolvedValue({
      summary: { health: null, roomCount: 1, overdueCount: 1 },
      rooms: [{ id: 'r', name: 'Garaje', emoji: '🚗', color: 'slate', zones: [], health: null, overdueCount: 1, activeTaskCount: 0, next: null }],
    });
    const { el } = await render();
    expect(el.querySelector('[data-testid="rooms-summary"]')?.textContent).toContain('Hogar: Sin tareas1 habitación · 1 tarea atrasada');
    expect(el.querySelector('[data-testid="room-card"]')?.textContent).toContain('1 atrasada');
  });

  it('«Nueva habitación» opens the room form sheet', async () => {
    api.get.mockResolvedValue({ summary: { health: null, roomCount: 0, overdueCount: 0 }, rooms: [] });
    const { el } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('[data-testid="new-room"]')!.click();
    expect(navigate).toHaveBeenCalledWith([], { queryParams: { sheet: 'room-new' } });
  });

  it('reloads when a sheet saves (RefreshBus) and ignores an older answer that arrives late', async () => {
    let resolveFirst!: (v: unknown) => void;
    const first = new Promise((r) => (resolveFirst = r));
    const fresh = { summary: { health: null, roomCount: 1, overdueCount: 0 }, rooms: [{ id: 'r', name: 'Nueva', emoji: '🚗', color: 'slate', zones: [], health: null, overdueCount: 0, activeTaskCount: 0, next: null }] };
    api.get.mockReset().mockReturnValueOnce(first).mockResolvedValue(fresh);
    TestBed.configureTestingModule({ imports: [Rooms], providers: [provideRouter([]), { provide: HouseholdApi, useValue: api }] });
    const fixture = TestBed.createComponent(Rooms);
    fixture.detectChanges();
    TestBed.inject(RefreshBus).bump();
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    resolveFirst({ summary: { health: null, roomCount: 0, overdueCount: 0 }, rooms: [] });
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="room-card"]')?.textContent).toContain('Nueva');
  });

  it('plural', () => {
    expect([plural(1, 'atrasada', 'atrasadas'), plural(3, 'atrasada', 'atrasadas')]).toEqual(['1 atrasada', '3 atrasadas']);
  });
});
