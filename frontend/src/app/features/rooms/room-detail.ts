import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { RefreshBus } from '../../core/refresh-bus';
import { HealthRing } from '../../shared/health-ring';
import { ErrorState, LoadState } from '../../shared/states';
import { TaskRow } from '../../shared/task-row';
import { TaskSummary } from '../../shared/task.model';
import { plural, Room } from './rooms.model';

interface Group {
  name: string;
  tasks: TaskSummary[];
}

/** #screen-room-detail: a room's health and its tasks by zone (E03/US-007). */
@Component({
  selector: 'la-room-detail',
  imports: [RouterLink, HealthRing, ErrorState, TaskRow],
  templateUrl: './room-detail.html',
})
export class RoomDetail {
  private readonly api = inject(HouseholdApi);
  private readonly router = inject(Router);
  private readonly refresh = inject(RefreshBus);
  /** Route parameter (/rooms/:id). */
  readonly id = input.required<string>();

  protected readonly plural = plural;
  protected readonly state = signal<LoadState>('loading');
  private loads = 0;
  protected readonly room = signal<Room | null>(null);
  protected readonly tasks = signal<TaskSummary[]>([]);
  /** Zones in their order (only those with tasks), then «Sin zona». */
  protected readonly groups = computed<Group[]>(() => {
    const zones = this.room()?.zones ?? [];
    const groups = zones.map((z) => ({ name: z.name, tasks: this.tasks().filter((t) => t.zone?.id === z.id) }));
    groups.push({ name: 'Sin zona', tasks: this.tasks().filter((t) => !t.zone) });
    return groups.filter((g) => g.tasks.length);
  });

  constructor() {
    // Reloads when the room changes and when a sheet saved something (a new task…).
    effect(() => {
      this.refresh.version();
      void this.load(this.id());
    });
  }

  protected async load(id = this.id()): Promise<void> {
    const load = ++this.loads; // a slower earlier answer must not overwrite a newer one
    this.state.set('loading');
    try {
      // The title shows as soon as the room arrives, also while its tasks load or fail (as in the prototype).
      const tasks = this.api.get<TaskSummary[]>(`/tasks?room=${id}`);
      const room = await this.api.get<Room>(`/rooms/${id}`);
      if (load !== this.loads) return;
      this.room.set(room);
      const list = await tasks;
      if (load !== this.loads) return;
      this.tasks.set(list);
      this.state.set('ready');
    } catch {
      if (load === this.loads) this.state.set('error');
    }
  }

  protected edit(): void {
    void this.router.navigate([], { queryParams: { sheet: 'room-edit', room: this.id() } });
  }

  protected addTask(): void {
    void this.router.navigate([], { queryParams: { sheet: 'task-new', room: this.id() } });
  }

  protected openTask(task: TaskSummary): void {
    void this.router.navigate(['/tasks', task.id]);
  }
}
