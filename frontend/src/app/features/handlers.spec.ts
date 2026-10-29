// Navigation handlers of the screens (sheets and links through the URL), which the e2e cover end to end.
import { signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HouseholdApi } from '../core/household-api';
import { SessionStore } from '../core/session.store';
import { RoomDetail } from './rooms/room-detail';
import { TaskDetail } from './tasks/task-detail';
import { Today } from './today/today';

const task = { id: 't', title: 'X', roomId: 'r', roomName: 'Baño', roomEmoji: '🛁', zone: null, estimatedMinutes: 5, nextDue: '2026-10-14', due: { kind: 'today', label: 'Hoy' }, assignee: null };

async function create<T>(component: Type<T>, data: unknown, inputs: Record<string, string> = {}) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideRouter([]), { provide: HouseholdApi, useValue: { get: vi.fn().mockResolvedValue(data) } }, { provide: SessionStore, useValue: { household: signal({ name: 'Casa' }) } }],
  });
  const fixture = TestBed.createComponent(component);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
  const router = TestBed.inject(Router);
  return { el: fixture.nativeElement as HTMLElement, navigate: vi.spyOn(router, 'navigate').mockResolvedValue(true), navigateByUrl: vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true) };
}

describe('screen handlers', () => {
  it('Hoy: open a task, check it, new task, the household, filters and «Ver habitaciones»', async () => {
    const { el, navigate, navigateByUrl } = await create(Today, { date: '2026-10-14', summary: { health: null, pendingToday: 1, streak: 1 }, groups: { overdue: [], today: [task], upcoming: [] }, rooms: [] });
    el.querySelector<HTMLElement>('[data-testid="task-row"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith(['/today/tasks', 't']);
    el.querySelector<HTMLElement>('[data-testid="task-check"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { sheet: 'complete', task: 't' } }));
    el.querySelector<HTMLElement>('[data-testid="new-task-desktop"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { sheet: 'task-new' } }));
    el.querySelector<HTMLElement>('[data-testid="home-switch"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { sheet: 'homes' } }));
    el.querySelector<HTMLElement>('[data-testid="filter-mine"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { f: 'mine' } }));
    el.querySelector<HTMLElement>('[data-testid="filter-time"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { max: '15' } }));
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('Hoy empty: «Ver habitaciones»', async () => {
    const { el, navigateByUrl } = await create(Today, { date: '2026-10-14', summary: { health: null, pendingToday: 0, streak: 0 }, groups: { overdue: [], today: [], upcoming: [] }, rooms: [] });
    el.querySelector<HTMLButtonElement>('[data-testid="today-empty"] button')!.click();
    expect(navigateByUrl).toHaveBeenCalledWith('/rooms');
  });

  it('room detail: edit the room, add a task, check a task', async () => {
    const room = { id: 'r', name: 'Baño', emoji: '🛁', color: 'blue', zones: [], health: null, overdueCount: 0, activeTaskCount: 1, next: null };
    TestBed.resetTestingModule();
    const api = { get: vi.fn((url: string) => Promise.resolve(url.startsWith('/rooms') ? room : [task])) };
    TestBed.configureTestingModule({ imports: [RoomDetail], providers: [provideRouter([]), { provide: HouseholdApi, useValue: api }] });
    const fixture = TestBed.createComponent(RoomDetail);
    fixture.componentRef.setInput('id', 'r');
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    el.querySelector<HTMLElement>('[data-testid="room-edit"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { sheet: 'room-edit', room: 'r' } });
    el.querySelector<HTMLElement>('[data-testid="fab-add-task"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { sheet: 'task-new', room: 'r' } });
    el.querySelector<HTMLElement>('[data-testid="task-check"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { sheet: 'complete', task: 't' } });
  });

  it('task detail: «Marcar hecha» and «Editar tarea»', async () => {
    const detail = { ...task, freqValue: 1, freqUnit: 'week', priority: 'medium', notes: null, subtasks: [], products: [], lastDone: null, history: [] };
    const { el, navigate } = await create(TaskDetail, detail, { id: 't' });
    el.querySelector<HTMLElement>('[data-testid="task-complete"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { sheet: 'complete', task: 't' } });
    el.querySelector<HTMLElement>('[data-testid="task-edit"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { sheet: 'task-edit', task: 't' } });
  });
});
