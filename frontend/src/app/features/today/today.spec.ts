import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { SessionStore } from '../../core/session.store';
import { Today } from './today';
import { longDay } from './today.model';

describe('Today', () => {
  async function render(data: unknown) {
    const api = { get: vi.fn().mockResolvedValue(data) };
    TestBed.configureTestingModule({
      imports: [Today],
      providers: [provideRouter([]), { provide: HouseholdApi, useValue: api }, { provide: SessionStore, useValue: { household: signal({ name: 'Casa' }) } }],
    });
    const fixture = TestBed.createComponent(Today);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('leaves out empty groups and the streak when it is 0; singular counts', async () => {
    const task = { id: 't', title: 'X', roomId: 'r', roomName: 'Baño', roomEmoji: '🛁', zone: null, estimatedMinutes: 5, nextDue: '2026-10-14', due: { kind: 'today', label: 'Hoy' }, assignee: null };
    const el = await render({ date: '2026-10-14', summary: { health: null, pendingToday: 1, streak: 0 }, groups: { overdue: [], today: [task], upcoming: [] } });
    expect([...el.querySelectorAll('.group-h')].map((g) => g.textContent?.trim())).toEqual(['Hoy 1']);
    expect(el.querySelector('[data-testid="home-summary"]')?.textContent).toContain('100 % limpio · 1 tarea pendiente hoy');
    expect(el.querySelector('[data-testid="home-streak"]')).toBeNull();
  });

  it('longDay', () => {
    expect(longDay('2026-10-14')).toBe('Miércoles 14 de octubre');
    expect(longDay('2026-01-04')).toBe('Domingo 4 de enero');
  });
});
