import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BROWSER_CONFIRM } from '../../core/browser';
import { HouseholdApi } from '../../core/household-api';
import { TaskDetail } from './task-detail';

const TASK = {
  id: 't', title: 'Limpiar WC', roomId: 'r', roomName: 'Baño', roomEmoji: '🛁', zone: null, freqValue: 3, freqUnit: 'day', nextDue: '2026-10-14',
  due: { kind: 'today', label: 'Hoy' }, estimatedMinutes: 8, priority: 'high', assignee: null, notes: null, subtasks: [], products: [], lastDone: null, history: [],
};

describe('TaskDetail', () => {
  const api = { get: vi.fn(), delete: vi.fn() };
  const confirm = vi.fn();

  async function render() {
    TestBed.configureTestingModule({
      imports: [TaskDetail],
      providers: [provideRouter([]), { provide: HouseholdApi, useValue: api }, { provide: BROWSER_CONFIRM, useValue: confirm }],
    });
    const fixture = TestBed.createComponent(TaskDetail);
    fixture.componentRef.setInput('id', 't');
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    api.get.mockReset().mockResolvedValue(TASK);
    api.delete.mockReset().mockResolvedValue(null);
    confirm.mockReset();
  });

  it('plural frequency, priority, no assignee, no sections without content', async () => {
    const { el } = await render();
    expect(el.textContent).toContain('Cada 3 días');
    expect(el.querySelector('.pri')?.className).toBe('pri high');
    expect(el.querySelector('.pri')?.textContent).toBe('Alta');
    expect(el.textContent).toContain('Sin asignar');
    expect(el.querySelector('[data-testid="task-checklist"]')).toBeNull();
    expect(el.textContent).not.toContain('Notas');
  });

  it('«Más acciones» archives only after confirming; «Volver» goes back', async () => {
    const { el, fixture } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const more = el.querySelector<HTMLButtonElement>('[aria-label="Más acciones"]')!;
    confirm.mockReturnValue(false);
    more.click();
    expect(api.delete).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    more.click();
    await fixture.whenStable();
    expect(api.delete).toHaveBeenCalledWith('/tasks/t');
    expect(navigate).toHaveBeenCalledWith(['/rooms', 'r'], { replaceUrl: true });

    const back = vi.spyOn(TestBed.inject(Location), 'back');
    el.querySelector<HTMLButtonElement>('[data-testid="back"]')!.click();
    expect(back).toHaveBeenCalled();
  });
});
