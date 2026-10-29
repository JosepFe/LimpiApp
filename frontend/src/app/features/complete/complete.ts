import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HouseholdApi } from '../../core/household-api';
import { RefreshBus } from '../../core/refresh-bus';
import { SessionStore } from '../../core/session.store';
import { ToastService } from '../../core/toast';
import { Sheet } from '../../shared/sheet';
import { TaskDetail } from '../../shared/task.model';
import { resizeImage } from './resize-image';

export const MAX_PHOTOS = 3;

interface Photo {
  file: Blob;
  url: string;
}

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
export class Complete implements OnInit, OnDestroy {
  private readonly api = inject(HouseholdApi);
  private readonly toast = inject(ToastService);
  private readonly http = inject(HttpClient);
  private destroyed = false;
  private readonly refresh = inject(RefreshBus);
  private readonly session = inject(SessionStore);
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
  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly photos = signal<Photo[]>([]);
  /** The task was done but a photo could not be uploaded. */
  protected readonly photosFailed = signal(false);

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

  ngOnDestroy(): void {
    this.destroyed = true;
    this.photos().forEach((p) => URL.revokeObjectURL(p.url));
  }

  /** Up to 3, reduced to 1600 px in the browser before uploading. */
  protected async addPhotos(input: HTMLInputElement): Promise<void> {
    const files = [...(input.files ?? [])];
    input.value = '';
    for (const file of files) {
      const blob = await resizeImage(file).catch(() => file);
      // Checked after the await: two quick picks must not go over 3, and a closed sheet keeps nothing.
      if (this.destroyed || this.photos().length >= MAX_PHOTOS) return;
      this.photos.update((list) => [...list, { file: blob, url: URL.createObjectURL(blob) }]);
    }
  }

  protected removePhoto(photo: Photo): void {
    URL.revokeObjectURL(photo.url);
    this.photos.update((list) => list.filter((p) => p !== photo));
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
      const result = await this.api.post<CompleteResponse>(`/tasks/${this.taskId()}/complete`, { subtasksDone: this.doneCount(), minutes: this.minutes(), note });
      await this.uploadPhotos(result.completionId);
      this.result.set(result);
      this.changed.emit();
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  /** «Deshacer» in the sheet: back as it was, the sheet closes (E04/US-007). */
  protected async undo(): Promise<void> {
    const result = this.result();
    if (!result) return;
    try {
      await this.api.post(`/completions/${result.completionId}/undo`, null);
      this.changed.emit();
      this.closed.emit();
    } catch {
      this.toast.show('Ya no se puede deshacer.');
      this.closed.emit();
    }
  }

  /** «Listo»: closes and leaves «Tarea completada · Deshacer» a few seconds (only its author, 10 minutes: the API checks). */
  protected finish(): void {
    const result = this.result()!;
    // The sheet is gone when the toast is used: the action talks to root services, not to this component, and to
    // this household even if the user switches to another one meanwhile.
    const { http, toast, refresh, session } = this;
    const url = this.api.url(`/completions/${result.completionId}/undo`);
    this.closed.emit();
    toast.show('Tarea completada', {
      label: 'Deshacer',
      run: async () => {
        try {
          await firstValueFrom(http.post(url, null));
          refresh.bump();
          void session.refreshCounters();
        } catch {
          toast.show('Ya no se puede deshacer.');
        }
      },
    });
  }

  /** After the completion exists; a failing photo keeps the completion and is reported (E04/US-006). */
  private async uploadPhotos(completionId: string): Promise<void> {
    for (const photo of this.photos()) {
      const form = new FormData();
      form.append('file', photo.file, 'foto.jpg');
      try {
        await this.api.post(`/completions/${completionId}/photos`, form);
      } catch {
        this.photosFailed.set(true);
      }
    }
  }
}
