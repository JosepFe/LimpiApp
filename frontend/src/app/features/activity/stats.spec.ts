import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { barClass, donut, Stats } from './stats';

describe('Stats', () => {
  it('bar colours and the donut from the share', () => {
    expect([barClass(null), barClass({ value: 95, label: 'Impecable', level: 'ok' }), barClass({ value: 78, label: 'Bien', level: 'good' }),
      barClass({ value: 55, label: 'Atención', level: 'warn' }), barClass({ value: 20, label: 'Urgente', level: 'bad' })]).toEqual(['', 'ok', 'ok', 'warn', 'bad']);
    const p = (avatarColor: string) => ({ id: avatarColor, name: avatarColor, avatarColor });
    expect(donut([{ person: p('teal'), points: 2, percent: 67 }, { person: p('amber'), points: 1, percent: 33 }])).toBe('conic-gradient(var(--av-teal) 0 67%,var(--av-amber) 0 100%)');
    expect(donut([])).toBe('var(--border)');
  });

  it('a room without tasks says so; a failed load shows the error', async () => {
    const api = { get: vi.fn().mockResolvedValueOnce({ completed: 1, minutes: 5, overdue: 0, rooms: [{ name: 'Garaje', emoji: '🚗', health: null }], weeks: [{ week: 42, count: 1 }], share: [] })
      .mockRejectedValueOnce(new Error('x')) };
    TestBed.configureTestingModule({ imports: [Stats], providers: [provideRouter([]), { provide: HouseholdApi, useValue: api }] });
    const fixture = TestBed.createComponent(Stats);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Sin tareas');
    expect(el.querySelector('.donut')?.getAttribute('aria-label')).toBe('Sin tareas esta semana');
    await (fixture.componentInstance as unknown as { load: () => Promise<void> }).load();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="stats-error"]')).not.toBeNull();
  });
});
