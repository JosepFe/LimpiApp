import { Location } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BROWSER_CONFIRM } from '../../core/browser';
import { HouseholdApi } from '../../core/household-api';
import { RefreshBus } from '../../core/refresh-bus';
import { initial } from '../../shared/avatar';
import { shortDay } from '../../shared/dates';
import { ErrorState, LoadState } from '../../shared/states';
import { PRIORITY_LABELS, TaskDetail as Task, UNIT_LABELS } from '../../shared/task.model';

/** #screen-task-detail: how a task is done and who did it the last times (E03/US-009). */
@Component({
  selector: 'la-task-detail',
  imports: [ErrorState],
  templateUrl: './task-detail.html',
})
export class TaskDetail {
  private readonly api = inject(HouseholdApi);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly confirm = inject(BROWSER_CONFIRM);
  private readonly refresh = inject(RefreshBus);
  /** Route parameter (/tasks/:id). */
  readonly id = input.required<string>();

  protected readonly state = signal<LoadState>('loading');
  protected readonly task = signal<Task | null>(null);
  protected readonly initial = initial;
  protected readonly shortDay = shortDay;
  protected readonly priority = PRIORITY_LABELS;
  protected readonly frequency = computed(() => {
    const t = this.task();
    return t ? `Cada ${t.freqValue} ${UNIT_LABELS[t.freqUnit][t.freqValue === 1 ? 0 : 1]}` : '';
  });
  protected readonly place = computed(() => {
    const t = this.task();
    return t ? [`${t.roomEmoji} ${t.roomName}`, t.zone?.name].filter(Boolean).join(' · ') : '';
  });

  constructor() {
    effect(() => {
      this.refresh.version(); // reload after «Editar tarea» saves
      void this.load(this.id());
    });
  }

  protected async load(id = this.id()): Promise<void> {
    this.state.set('loading');
    try {
      this.task.set(await this.api.get<Task>(`/tasks/${id}`));
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }

  protected back(): void {
    this.location.back();
  }

  protected edit(): void {
    void this.router.navigate([], { queryParams: { sheet: 'task-edit', task: this.id() } });
  }

  /** «Más acciones»: archive the task (it leaves Hoy and its room; the history stays). */
  protected async archive(): Promise<void> {
    if (!this.confirm('¿Archivar esta tarea? Dejará de aparecer en Hoy.')) return;
    await this.api.delete(`/tasks/${this.id()}`);
    await this.router.navigate(['/rooms', this.task()!.roomId], { replaceUrl: true });
  }
}
