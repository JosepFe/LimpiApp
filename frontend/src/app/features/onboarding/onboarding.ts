import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../core/session.store';

export interface RoomTemplate {
  id: string;
  name: string;
  emoji: string;
  color: string;
  taskCount: number;
}

/** Preselected as in the prototype: Cocina, Baño, Dormitorio, Salón and Terraza. */
export const DEFAULT_TEMPLATES = ['kitchen', 'bathroom', 'bedroom', 'living', 'terrace'];

export const TIME_ZONES = ['Europe/Madrid', 'Atlantic/Canary', 'Europe/London'];

/** #screen-onboarding: create the first household (E02/US-006 name and time zone; US-007 templates). */
@Component({
  selector: 'la-onboarding',
  templateUrl: './onboarding.html',
})
export class Onboarding {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(SessionStore);

  protected readonly timeZones = TIME_ZONES;
  protected readonly step = signal<'name' | 'templates' | 'creating'>('name');
  protected readonly templates = signal<RoomTemplate[]>([]);
  protected readonly selected = signal(new Set(DEFAULT_TEMPLATES));
  protected readonly summary = computed(() => {
    const chosen = this.templates().filter((t) => this.selected().has(t.id));
    const tasks = chosen.reduce((sum, t) => sum + t.taskCount, 0);
    return `${chosen.length} ${chosen.length === 1 ? 'habitación' : 'habitaciones'} · ${tasks} ${tasks === 1 ? 'tarea' : 'tareas'}`;
  });
  protected readonly name = signal('');
  protected readonly timeZone = signal(TIME_ZONES[0]);
  protected readonly nameInvalid = signal(false);
  protected readonly failed = signal(false);

  protected next(): void {
    if (!this.name().trim()) {
      this.nameInvalid.set(true);
      return;
    }
    this.nameInvalid.set(false);
    this.step.set('templates');
    if (!this.templates().length) {
      void firstValueFrom(this.http.get<RoomTemplate[]>('/api/templates')).then((t) => this.templates.set(t));
    }
  }

  protected back(): void {
    this.step.set('name');
  }

  protected toggle(id: string): void {
    const next = new Set(this.selected());
    if (!next.delete(id)) next.add(id);
    this.selected.set(next);
  }

  protected async create(): Promise<void> {
    this.step.set('creating');
    this.failed.set(false);
    try {
      const templates = this.templates().map((t) => t.id).filter((id) => this.selected().has(id));
      const created = await firstValueFrom(
        this.http.post<{ id: string }>('/api/households', { name: this.name().trim(), timeZone: this.timeZone(), templates }),
      );
      await this.session.load();
      this.session.selectHousehold(created.id);
      await this.router.navigateByUrl('/today');
    } catch {
      // As in the prototype: back to the first step with the error banner.
      this.failed.set(true);
      this.step.set('name');
    }
  }
}
