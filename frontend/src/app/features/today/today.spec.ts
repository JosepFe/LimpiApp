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
    const el = await render({ date: '2026-10-14', summary: { health: null, pendingToday: 1, streak: 0 }, groups: { overdue: [], today: [task], upcoming: [] }, rooms: [] });
    expect([...el.querySelectorAll('.group-h')].map((g) => g.textContent?.trim())).toEqual(['Hoy 1']);
    expect(el.querySelector('[data-testid="home-summary"]')?.textContent).toContain('100 % limpio · 1 tarea pendiente hoy');
    expect(el.querySelector('[data-testid="home-streak"]')).toBeNull();
  });

  it('longDay', () => {
    expect(longDay('2026-10-14')).toBe('Miércoles 14 de octubre');
    expect(longDay('2026-01-04')).toBe('Domingo 4 de enero');
  });
});

describe('apiQuery', () => {
  it('turns the filters into the API query', async () => {
    const { apiQuery } = await import('./today.model');
    expect(apiQuery({ mine: false, room: null, quick: false })).toBe('');
    expect(apiQuery({ mine: true, room: 'r', quick: true })).toBe('?filter=mine&room=r&max=15');
  });
});

describe('Today with the household day', () => {
  it('the header shows the date the API answers (the household zone), and a non-id room is ignored', async () => {
    const api = { get: vi.fn().mockResolvedValue({ date: '2026-10-15', summary: { health: null, pendingToday: 0, streak: 0 }, groups: { overdue: [], today: [], upcoming: [] }, rooms: [] }) };
    const { provideRouter, Router } = await import('@angular/router');
    const { signal } = await import('@angular/core');
    const { TestBed } = await import('@angular/core/testing');
    const { HouseholdApi } = await import('../../core/household-api');
    const { SessionStore } = await import('../../core/session.store');
    const { Today } = await import('./today');
    TestBed.configureTestingModule({
      imports: [Today],
      providers: [provideRouter([{ path: 'today', component: Today }]), { provide: HouseholdApi, useValue: api }, { provide: SessionStore, useValue: { household: signal({ name: 'Casa' }) } }],
    });
    await TestBed.inject(Router).navigateByUrl('/today?room=../../x');
    const fixture = TestBed.createComponent(Today);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.ph-sub')?.textContent).toBe('Jueves 15 de octubre');
    expect(api.get).toHaveBeenCalledWith('/today');
  });
});
