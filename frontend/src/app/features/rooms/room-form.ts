import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BROWSER_CONFIRM } from '../../core/browser';
import { HouseholdApi } from '../../core/household-api';
import { Sheet } from '../../shared/sheet';
import { Room } from './rooms.model';

export const ROOM_EMOJIS = ['🍳', '🛁', '🛏️', '🛋️', '🚪', '🧺', '💻', '🌿', '🚿', '🪟', '🧸', '🚗', '📚', '🍽️', '🪴', '🏠'];
export const ROOM_COLORS = ['green', 'orange', 'blue', 'violet', 'rose', 'teal', 'amber', 'slate'];

interface Template {
  id: string;
  name: string;
  emoji: string;
  taskCount: number;
}

interface ZoneRow {
  key: number;
  id: string | null;
  name: string;
}

/** #screen-room-form: new or edit a room, its zones, template tasks, and archive it (E03/US-006). */
@Component({
  selector: 'la-room-form',
  imports: [Sheet],
  templateUrl: './room-form.html',
})
export class RoomForm implements OnInit {
  private readonly api = inject(HouseholdApi);
  private readonly http = inject(HttpClient);
  private readonly confirm = inject(BROWSER_CONFIRM);
  /** Room to edit; without it, a new one. */
  readonly roomId = input<string | null>(null);
  readonly closed = output();
  /** Saved or archived: the list reloads. */
  readonly changed = output<{ archived: boolean }>();

  protected readonly emojis = ROOM_EMOJIS;
  protected readonly colors = ROOM_COLORS;
  protected readonly name = signal('');
  protected readonly emoji = signal('🍳');
  protected readonly color = signal('orange');
  protected readonly zones = signal<ZoneRow[]>([]);
  protected readonly fromTemplate = signal(false);
  protected readonly nameMissing = signal(false);
  protected readonly saving = signal(false);
  /** Loading or saving failed: «No se ha podido guardar…» banner. */
  protected readonly failed = signal<string | null>(null);
  private readonly templates = signal<Template[]>([]);
  private nextKey = 0;

  /** The template of the chosen icon: «Rellenar con tareas sugeridas (Cocina: 6 tareas)». */
  protected readonly template = computed(() => this.templates().find((t) => t.emoji === this.emoji()) ?? null);

  async ngOnInit(): Promise<void> {
    try {
      await this.loadForm();
    } catch {
      this.failed.set('No hemos podido cargar los datos.');
    }
  }

  private async loadForm(): Promise<void> {
    const id = this.roomId();
    if (id) {
      const room = await this.api.get<Room>(`/rooms/${id}`);
      this.name.set(room.name);
      this.emoji.set(room.emoji);
      this.color.set(room.color);
      this.zones.set(room.zones.map((z) => ({ key: this.nextKey++, id: z.id, name: z.name })));
    } else {
      this.templates.set(await firstValueFrom(this.http.get<Template[]>('/api/templates')));
    }
  }

  protected addZone(): void {
    this.zones.update((list) => [...list, { key: this.nextKey++, id: null, name: '' }]);
  }

  protected renameZone(key: number, name: string): void {
    this.zones.update((list) => list.map((z) => (z.key === key ? { ...z, name } : z)));
  }

  protected removeZone(key: number): void {
    this.zones.update((list) => list.filter((z) => z.key !== key));
  }

  protected async save(): Promise<void> {
    const name = this.name().trim();
    if (!name) {
      this.nameMissing.set(true);
      return;
    }
    this.saving.set(true);
    try {
      const body = {
        name,
        emoji: this.emoji(),
        color: this.color(),
        zones: this.zones().filter((z) => z.name.trim()).map((z) => ({ id: z.id, name: z.name.trim() })),
      };
      const id = this.roomId();
      const room = id ? await this.api.patch<Room>(`/rooms/${id}`, body) : await this.api.post<Room>('/rooms', body);
      const template = this.template();
      if (!id && this.fromTemplate() && template) {
        await this.api.post(`/rooms/${room.id}/from-template`, { templateId: template.id });
      }
      this.changed.emit({ archived: false });
    } catch {
      this.failed.set('No se ha podido guardar. Inténtalo de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async archive(): Promise<void> {
    if (!this.confirm('¿Archivar esta habitación? Sus tareas dejarán de aparecer en Hoy.')) return;
    try {
      await this.api.delete(`/rooms/${this.roomId()}`);
      this.changed.emit({ archived: true });
    } catch {
      this.failed.set('No se ha podido archivar. Inténtalo de nuevo.');
    }
  }
}
