import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { SessionStore } from '../../core/session.store';
import { Ranking } from './ranking';

const row = (id: string, name: string, points: number, tasks: number, streak: number) => ({ id, name, avatarColor: 'teal', points, tasks, streak });

describe('Ranking', () => {
  const api = { get: vi.fn() };
  const session = { me: signal({ id: 'u-ana' }) };

  async function render() {
    TestBed.configureTestingModule({
      imports: [Ranking],
      providers: [provideRouter([]), { provide: HouseholdApi, useValue: api }, { provide: SessionStore, useValue: session }],
    });
    const fixture = TestBed.createComponent(Ranking);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => api.get.mockReset());

  it('singulars, no streak badge at 0 and a podium of the people there are', async () => {
    api.get.mockResolvedValue({ period: 'week', householdStreak: 1, hasPoints: true, rows: [row('u-ana', 'Ana', 3, 1, 0), row('u-bea', 'Bea', 0, 0, 0)] });
    const { el } = await render();
    expect(el.querySelector('[data-testid="home-streak"]')?.textContent).toBe('🔥 Racha del hogar: 1 día');
    const rows = el.querySelectorAll('[data-testid="ranking-row"]');
    expect(rows[0].textContent).toContain('Ana tú1 tarea');
    expect(rows[0].classList).toContain('sel');
    expect(rows[0].querySelector('.badge.today')).toBeNull();
    expect([...el.querySelectorAll('.pod')].map((p) => p.className)).toEqual(['pod p2', 'pod p1']);
  });

  it('«Reintentar» after an error loads again; the same period is not requested twice', async () => {
    api.get.mockRejectedValueOnce(new Error('500'));
    const { fixture, el } = await render();
    expect(el.querySelector('[data-testid="ranking-error"]')).not.toBeNull();

    api.get.mockResolvedValue({ period: 'week', householdStreak: 0, hasPoints: true, rows: [row('u-ana', 'Ana', 0, 0, 0)] });
    el.querySelector<HTMLButtonElement>('[data-testid="retry"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="period-week"]')!.click();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[data-testid="ranking-content"]')).not.toBeNull();
  });
});
