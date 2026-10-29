import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { RefreshBus } from '../../core/refresh-bus';
import { Health } from '../../shared/health-ring';
import { ErrorState, LoadState } from '../../shared/states';
import { Person } from '../../shared/task.model';

/** GET /households/{id}/stats (E05/US-004). */
export interface StatsResponse {
  completed: number;
  minutes: number;
  overdue: number;
  rooms: { name: string; emoji: string; health: Health | null }[];
  weeks: { week: number; count: number }[];
  share: { person: Person; points: number; percent: number }[];
}

/** Bar colour of a room's health (the prototype uses ok for «Bien» too). */
export const barClass = (h: Health | null) => (!h ? '' : h.level === 'warn' ? 'warn' : h.level === 'bad' ? 'bad' : 'ok');

/** The donut of «Reparto del trabajo»: one slice per person in their avatar colour. */
export function donut(share: StatsResponse['share']): string {
  let at = 0;
  const slices = share.map((s) => {
    at += s.percent;
    return `var(--av-${s.person.avatarColor}) 0 ${at}%`;
  });
  return slices.length ? `conic-gradient(${slices.join(',')})` : 'var(--border)';
}

/** #screen-stats: figures, health by room, tasks per week and this week's share (E05/US-005). */
@Component({
  selector: 'la-stats',
  imports: [RouterLink, ErrorState],
  templateUrl: './stats.html',
})
export class Stats {
  private readonly api = inject(HouseholdApi);
  private readonly refresh = inject(RefreshBus);
  protected readonly state = signal<LoadState>('loading');
  protected readonly data = signal<StatsResponse | null>(null);
  protected readonly barClass = barClass;
  private loads = 0;

  /** Nothing done in the 12 weeks: «Aún no hay suficientes datos». */
  protected readonly empty = computed(() => !!this.data() && this.data()!.weeks.every((w) => !w.count) && !this.data()!.completed);
  protected readonly maxWeek = computed(() => Math.max(1, ...(this.data()?.weeks.map((w) => w.count) ?? [])));
  protected readonly donut = computed(() => donut(this.data()?.share ?? []));
  protected readonly donutLabel = computed(() => (this.data()?.share ?? []).map((s) => `${s.person.name} ${s.percent} %`).join(', '));

  constructor() {
    effect(() => {
      this.refresh.version();
      untracked(() => void this.load());
    });
  }

  protected async load(): Promise<void> {
    const load = ++this.loads;
    this.state.set('loading');
    try {
      const data = await this.api.get<StatsResponse>('/stats');
      if (load !== this.loads) return;
      this.data.set(data);
      this.state.set('ready');
    } catch {
      if (load === this.loads) this.state.set('error');
    }
  }
}
