import { TestBed } from '@angular/core/testing';
import { HouseholdApi } from '../../core/household-api';
import { Complete, points } from './complete';

describe('Complete', () => {
  it('points like the API: proportional, partial by subtasks, at least 1', () => {
    expect([points(30, 5, 5), points(30, 3, 5), points(30, 0, 5), points(20, 0, 0), points(1, 0, 0)]).toEqual([9, 5, 1, 6, 1]);
  });

  it('a task that cannot be loaded shows the error and cannot be confirmed; a task without subtasks has no checklist', async () => {
    const api = { get: vi.fn().mockRejectedValueOnce(new Error('x')), post: vi.fn() };
    TestBed.configureTestingModule({ imports: [Complete], providers: [{ provide: HouseholdApi, useValue: api }] });
    const fixture = TestBed.createComponent(Complete);
    fixture.componentRef.setInput('taskId', 't');
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.querySelector<HTMLButtonElement>('[data-testid="complete-confirm"]')!.disabled).toBe(true);
    expect(el.querySelector('[data-testid="complete-checklist"]')).toBeNull();
  });

  it('minutes stay between 5 and 600; the success shows singular point and day', async () => {
    const api = {
      get: vi.fn().mockResolvedValue({ title: 'X', roomName: 'Baño', roomEmoji: '🛁', zone: null, estimatedMinutes: 1, subtasks: [] }),
      post: vi.fn().mockResolvedValue({ points: 1, streak: 1, nextDueDay: 'jue 15 oct' }),
    };
    TestBed.configureTestingModule({ imports: [Complete], providers: [{ provide: HouseholdApi, useValue: api }] });
    const fixture = TestBed.createComponent(Complete);
    fixture.componentRef.setInput('taskId', 't');
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('[aria-label="Menos"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="complete-minutes"]')?.textContent).toBe('5 min');
    el.querySelector<HTMLButtonElement>('[data-testid="complete-confirm"]')!.click();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    expect(api.post).toHaveBeenCalledWith('/tasks/t/complete', { subtasksDone: 0, minutes: 5, note: null });
    expect(el.querySelector('[data-testid="complete-success"]')?.textContent).toContain('+1 punto');
    expect(el.querySelector('[data-testid="complete-success"]')?.textContent).toContain('Racha de 1 día');
  });
});
