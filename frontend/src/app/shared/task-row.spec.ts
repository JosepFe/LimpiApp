import { TestBed } from '@angular/core/testing';
import { TaskRow } from './task-row';

const TASK = {
  id: 't', title: 'Limpiar horno', roomId: 'r', roomName: 'Cocina', roomEmoji: '🍳', zone: { id: 'z', name: 'Horno' },
  estimatedMinutes: 45, nextDue: '2026-10-08', due: { kind: 'overdue' as const, label: 'Atrasada 6 d' }, assignee: { id: 'u', name: 'Pau', avatarColor: 'violet' },
};

describe('TaskRow', () => {
  function render(task = TASK, showRoom = false) {
    const fixture = TestBed.createComponent(TaskRow);
    fixture.componentRef.setInput('task', task);
    fixture.componentRef.setInput('showRoom', showRoom);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('shows room and zone in Hoy, only the zone in a room, the due badge and the assignee', () => {
    expect(render(TASK, true).el.textContent?.replace(/\s+/g, ' ').trim()).toBe('🍳Limpiar hornoCocina · Horno · 45 minAtrasada 6 dP');
    const { el } = render(TASK, false);
    expect(el.querySelector('.s')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Horno · 45 min');
    expect(el.querySelector('.badge')?.className).toBe('badge overdue');
    expect(el.querySelector('.avatar')?.getAttribute('aria-label')).toBe('Pau');
  });

  it('without zone or assignee: only the minutes and «Sin asignar»', () => {
    const { el } = render({ ...TASK, zone: null, assignee: null } as never);
    expect(el.querySelector('.s')?.textContent?.trim()).toBe('45 min');
    expect(el.textContent).toContain('Sin asignar');
  });

  it('opens on click and Enter; the check only when checkable, without opening', () => {
    const { fixture, el } = render();
    const opened = vi.fn();
    const checked = vi.fn();
    fixture.componentInstance.opened.subscribe(opened);
    fixture.componentInstance.checked.subscribe(checked);
    el.querySelector<HTMLElement>('[data-testid="task-row"]')!.click();
    el.querySelector<HTMLElement>('[data-testid="task-row"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(opened).toHaveBeenCalledTimes(2);
    expect(el.querySelector<HTMLButtonElement>('[data-testid="task-check"]')!.disabled).toBe(true);
    fixture.componentRef.setInput('checkable', true);
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="task-check"]')!.click();
    expect(checked).toHaveBeenCalledTimes(1);
    expect(opened).toHaveBeenCalledTimes(2);
  });
});
