import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { HouseholdApi } from '../../core/household-api';
import { Sheet } from '../../shared/sheet';
import { FrequencyUnit, Person, Priority, PRIORITY_LABELS, TaskDetail, UNIT_LABELS } from '../../shared/task.model';
import { Room, RoomsResponse } from '../rooms/rooms.model';

export const MAX_SUBTASKS = 20;
const MINUTES_STEP = 5;

interface Product {
  id: string;
  name: string;
  emoji: string;
}

interface SubtaskRow {
  key: number;
  title: string;
}

/** Today in Madrid as yyyy-mm-dd (the households' zone; the API checks nothing about it, it is only a default). */
export const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());

/** #screen-task-form: new or edit a task with frequency, effort, assignee, subtasks, products and notes (E03/US-008). */
@Component({
  selector: 'la-task-form',
  imports: [Sheet],
  templateUrl: './task-form.html',
})
export class TaskForm implements OnInit {
  private readonly api = inject(HouseholdApi);
  /** Task to edit; without it, a new one (in `roomId`, if given). */
  readonly taskId = input<string | null>(null);
  readonly roomId = input<string | null>(null);
  readonly closed = output();
  readonly saved = output<string>();

  protected readonly maxSubtasks = MAX_SUBTASKS;
  protected readonly units = Object.entries(UNIT_LABELS) as [FrequencyUnit, [string, string]][];
  protected readonly priorities = Object.entries(PRIORITY_LABELS) as [Priority, string][];

  protected readonly rooms = signal<Room[]>([]);
  protected readonly members = signal<Person[]>([]);
  protected readonly allProducts = signal<Product[]>([]);

  protected readonly title = signal('');
  protected readonly room = signal('');
  protected readonly zone = signal('');
  protected readonly freqValue = signal(1);
  protected readonly freqUnit = signal<FrequencyUnit>('week');
  protected readonly nextDue = signal(localToday());
  protected readonly minutes = signal(15);
  protected readonly priority = signal<Priority>('medium');
  protected readonly assignee = signal('');
  protected readonly subtasks = signal<SubtaskRow[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly notes = signal('');

  protected readonly invalid = signal(false);
  protected readonly saving = signal(false);
  /** Saving or loading failed (not the empty title: that is `invalid`). */
  protected readonly failed = signal<string | null>(null);
  private nextKey = 0;

  protected readonly zones = computed(() => this.rooms().find((r) => r.id === this.room())?.zones ?? []);
  protected readonly available = computed(() => this.allProducts().filter((p) => !this.products().some((x) => x.id === p.id)));

  async ngOnInit(): Promise<void> {
    try {
      await this.loadForm();
    } catch {
      this.failed.set('No hemos podido cargar los datos.');
    }
  }

  private async loadForm(): Promise<void> {
    const [rooms, household, products] = await Promise.all([
      this.api.get<RoomsResponse>('/rooms'),
      this.api.get<{ members: Person[] }>(''),
      this.api.get<Product[]>('/products'),
    ]);
    this.rooms.set(rooms.rooms);
    this.members.set(household.members);
    this.allProducts.set(products);
    const id = this.taskId();
    if (id) {
      const t = await this.api.get<TaskDetail>(`/tasks/${id}`);
      this.title.set(t.title);
      this.room.set(t.roomId);
      this.zone.set(t.zone?.id ?? '');
      this.freqValue.set(t.freqValue);
      this.freqUnit.set(t.freqUnit);
      this.nextDue.set(t.nextDue);
      this.minutes.set(t.estimatedMinutes);
      this.priority.set(t.priority);
      this.assignee.set(t.assignee?.id ?? '');
      this.subtasks.set(t.subtasks.map((s) => ({ key: this.nextKey++, title: s.title })));
      this.products.set(t.products);
      this.notes.set(t.notes ?? '');
    } else {
      this.room.set(this.roomId() ?? rooms.rooms[0]?.id ?? '');
    }
  }

  protected chooseRoom(id: string): void {
    this.room.set(id);
    this.zone.set('');
  }

  /** 1-365; the field shows the corrected value too (the signal may not change: 1 → «0» → 1). */
  protected setFrequency(field: HTMLInputElement): void {
    const value = Math.min(365, Math.max(1, Math.round(+field.value) || 1));
    this.freqValue.set(value);
    field.value = String(value);
  }

  protected changeMinutes(delta: number): void {
    this.minutes.update((m) => Math.min(600, Math.max(MINUTES_STEP, m + delta * MINUTES_STEP)));
  }

  protected addSubtask(): void {
    if (this.subtasks().length >= MAX_SUBTASKS) return;
    this.subtasks.update((list) => [...list, { key: this.nextKey++, title: '' }]);
  }

  protected renameSubtask(key: number, title: string): void {
    this.subtasks.update((list) => list.map((s) => (s.key === key ? { ...s, title } : s)));
  }

  protected removeSubtask(key: number): void {
    this.subtasks.update((list) => list.filter((s) => s.key !== key));
  }

  protected addProduct(select: HTMLSelectElement): void {
    const product = this.allProducts().find((p) => p.id === select.value);
    if (product) this.products.update((list) => [...list, product]);
    select.value = '';
  }

  protected removeProduct(id: string): void {
    this.products.update((list) => list.filter((p) => p.id !== id));
  }

  protected async save(): Promise<void> {
    if (!this.title().trim()) {
      this.invalid.set(true);
      return;
    }
    this.invalid.set(false);
    this.failed.set(null);
    this.saving.set(true);
    const body = {
      title: this.title().trim(),
      roomId: this.room(),
      zoneId: this.zone() || null,
      freqValue: this.freqValue(),
      freqUnit: this.freqUnit(),
      nextDue: this.nextDue(),
      estimatedMinutes: this.minutes(),
      priority: this.priority(),
      assigneeId: this.assignee() || null,
      notes: this.notes().trim() || null,
      subtasks: this.subtasks().map((s) => s.title.trim()).filter(Boolean),
      productIds: this.products().map((p) => p.id),
    };
    try {
      const id = this.taskId();
      const task = id ? await this.api.patch<TaskDetail>(`/tasks/${id}`, body) : await this.api.post<TaskDetail>('/tasks', body);
      this.saved.emit(task.id);
    } catch (error) {
      // 400: a field the API rejected (zone, assignee, product…); anything else, try again.
      this.failed.set(error instanceof HttpErrorResponse && error.status === 400 ? 'Revisa los campos marcados.' : 'No se ha podido guardar. Inténtalo de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }
}
