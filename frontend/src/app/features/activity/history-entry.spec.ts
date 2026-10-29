import { TestBed } from '@angular/core/testing';
import { HouseholdApi } from '../../core/household-api';
import { HistoryEntry } from './history-entry';

describe('HistoryEntry', () => {
  async function render(get: () => Promise<unknown>) {
    TestBed.configureTestingModule({ imports: [HistoryEntry], providers: [{ provide: HouseholdApi, useValue: { get: vi.fn(get) } }] });
    const fixture = TestBed.createComponent(HistoryEntry);
    fixture.componentRef.setInput('entryId', 'e');
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('without subtasks, note or photos: no subtasks row, no note, «Sin fotos»; photos use the API path', async () => {
    const el = await render(() => Promise.resolve({ at: '2026-10-13T17:42:00Z', by: { name: 'Pau', avatarColor: 'violet' }, taskTitle: 'X', roomName: 'Baño', roomEmoji: '🛁',
      subtasksDone: 0, subtasksTotal: 0, minutes: 5, points: 1, note: null, photos: [], undone: false }));
    expect(el.textContent).not.toContain('Subtareas');
    expect(el.textContent).not.toContain('Nota');
    expect(el.textContent).toContain('Sin fotos');
    expect(el.textContent).toContain('mar 13 oct · 19:42');
  });

  it('a failed load shows the error', async () => {
    const el = await render(() => Promise.reject(new Error('x')));
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No hemos podido cargar los datos.');
  });
});
