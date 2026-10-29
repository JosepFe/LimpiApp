import { TestBed } from '@angular/core/testing';
import { HouseholdApi } from '../../core/household-api';
import { TaskForm } from './task-form';

const ROOMS = { rooms: [
  { id: 'r1', name: 'Cocina', emoji: '🍳', zones: [{ id: 'z1', name: 'Horno' }] },
  { id: 'r2', name: 'Baño', emoji: '🛁', zones: [] },
] };

describe('TaskForm', () => {
  const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn() };

  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    api.get.mockImplementation((url: string) =>
      Promise.resolve(url === '/rooms' ? ROOMS : url === '' ? { members: [] } : url === '/products' ? [] : {
        id: 't', title: 'X', roomId: 'r1', zone: { id: 'z1', name: 'Horno' }, freqValue: 2, freqUnit: 'day', nextDue: '2026-10-20',
        estimatedMinutes: 5, priority: 'low', assignee: null, notes: 'n', subtasks: [], products: [],
      }));
  });

  async function render(inputs: Record<string, string | null>) {
    TestBed.configureTestingModule({ imports: [TaskForm], providers: [{ provide: HouseholdApi, useValue: api }] });
    const fixture = TestBed.createComponent(TaskForm);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, q: <T extends HTMLElement>(id: string) => el.querySelector<T>(`[data-testid="${id}"]`)! };
  }

  it('changing room resets the zone; minutes stay between 5 and 600', async () => {
    const { fixture, el, q } = await render({ roomId: 'r1' });
    const zone = q<HTMLSelectElement>('task-zone');
    zone.value = 'z1';
    zone.dispatchEvent(new Event('change'));
    const room = q<HTMLSelectElement>('task-room');
    room.value = 'r2';
    room.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(q<HTMLSelectElement>('task-zone').options).toHaveLength(1);

    const less = el.querySelector<HTMLButtonElement>('[aria-label="Menos"]')!;
    for (let i = 0; i < 5; i++) less.click();
    fixture.detectChanges();
    expect(el.querySelector('output')?.textContent).toBe('5 min');
  });

  it('the frequency stays between 1 and 365, also in the field', async () => {
    const { fixture, q } = await render({ roomId: 'r1' });
    const n = q<HTMLInputElement>('task-freq-value');
    for (const [typed, kept] of [['0', '1'], ['400', '365'], ['', '1'], ['2.6', '3']]) {
      n.value = typed;
      n.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(n.value, typed).toBe(kept);
    }
  });

  it('edit loads the task and saves with PATCH without empty subtasks', async () => {
    api.patch.mockResolvedValue({ id: 't' });
    const { fixture, q } = await render({ taskId: 't' });
    expect(q<HTMLInputElement>('task-title').value).toBe('X');
    expect(q<HTMLSelectElement>('task-freq-unit').value).toBe('day');
    q('task-add-subtask').click();
    q('task-save').click();
    await fixture.whenStable();
    expect(api.patch).toHaveBeenCalledWith('/tasks/t', expect.objectContaining({ title: 'X', zoneId: 'z1', freqValue: 2, subtasks: [], notes: 'n', priority: 'low' }));
  });
});

describe('TaskForm load error', () => {
  it('shows «No hemos podido cargar los datos.»', async () => {
    TestBed.configureTestingModule({ imports: [TaskForm], providers: [{ provide: HouseholdApi, useValue: { get: vi.fn().mockRejectedValue(new Error('x')) } }] });
    const fixture = TestBed.createComponent(TaskForm);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('No hemos podido cargar los datos.');
  });
});
