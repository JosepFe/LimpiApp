import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { HouseholdApi } from '../../core/household-api';
import { Sheet } from '../../shared/sheet';
import { TaskDetail } from '../../shared/task.model';

/** POST /tasks/{id}/complete (E04/US-004). */
export interface CompleteResponse {
  completionId: string;
  points: number;
  streak: number;
  nextDue: string;
  nextDueDay: string;
}

/** Points as the API computes them (E04 D1), shown before confirming. */
export function points(estimatedMinutes: number, done: number, total: number): number {
  const base = Math.max(1, Math.round(estimatedMinutes * 0.3));
  return total === 0 ? base : Math.max(1, Math.round((base * done) / total));
}

/** #screen-complete «Marcar como hecha»: subtasks, time, note, photos and points; then «¡Hecho!» (E04/US-005). */
@Component({
  selector: 'la-complete',
  imports: [Sheet],
  templateUrl: './complete.html',
})
export class Complete implements OnInit {
  private readonly api = inject(HouseholdApi);
  readonly taskId = input.required<string>();
  readonly closed = output();
  /** Done (or undone): the screens behind reload. */
  readonly changed = output();

  protected readonly task = signal<TaskDetail | null>(null);
  protected readonly done = signal<boolean[]>([]);
  protected readonly minutes = signal(15);
  protected readonly note = signal('');
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly result = signal<CompleteResponse | null>(null);

  protected readonly doneCount = computed(() => this.done().filter(Boolean).length);
  protected readonly points = computed(() => {
    const t = this.task();
    return t ? points(t.estimatedMinutes, this.doneCount(), t.subtasks.length) : 0;
  });
  protected readonly place = computed(() => {
    const t = this.task();
    return t ? [t.roomName, t.zone?.name].filter(Boolean).join(' · ') : '';
  });

  async ngOnInit(): Promise<void> {
    try {
      const task = await this.api.get<TaskDetail>(`/tasks/${this.taskId()}`);
      this.task.set(task);
      this.done.set(task.subtasks.map(() => true));
      this.minutes.set(task.estimatedMinutes);
    } catch {
      this.failed.set(true);
    }
  }

  protected toggle(i: number): void {
    this.done.update((list) => list.map((d, j) => (j === i ? !d : d)));
  }

  protected changeMinutes(delta: number): void {
    this.minutes.update((m) => Math.min(600, Math.max(5, m + delta * 5)));
  }

  protected async confirm(): Promise<void> {
    this.saving.set(true);
    this.failed.set(false);
    try {
      const note = this.note().trim() || null;
      this.result.set(await this.api.post<CompleteResponse>(`/tasks/${this.taskId()}/complete`, { subtasksDone: this.doneCount(), minutes: this.minutes(), note }));
      this.changed.emit();
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}
