import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { HouseholdApi } from '../../core/household-api';
import { RefreshBus } from '../../core/refresh-bus';
import { SessionStore } from '../../core/session.store';
import { HealthRing } from '../../shared/health-ring';
import { ErrorState, LoadState, SkeletonList } from '../../shared/states';
import { TaskRow } from '../../shared/task-row';
import { TaskSummary } from '../../shared/task.model';
import { localToday } from '../tasks/task-form';
import { plural } from '../rooms/rooms.model';
import { apiQuery, longDay, TodayFilters, TodayResponse } from './today.model';

/**
 * #screen-today (E04/US-002): household health, what is pending, my streak and the tasks of the day. On desktop the
 * task detail opens in the right pane (child route /today/tasks/:id), on phones instead of the list.
 */
@Component({
  selector: 'la-today',
  imports: [RouterOutlet, HealthRing, SkeletonList, ErrorState, TaskRow],
  templateUrl: './today.html',
  styles: `
    @media (max-width: 1023px) {
      .twopane.has-detail > .pane-list { display: none; }
      .twopane.has-detail > .pane-detail { display: block; }
    }
  `,
})
export class Today {
  private readonly api = inject(HouseholdApi);
  private readonly router = inject(Router);
  private readonly refresh = inject(RefreshBus);
  protected readonly session = inject(SessionStore);
  protected readonly plural = plural;
  protected readonly date = longDay(localToday());
  protected readonly state = signal<LoadState>('loading');
  protected readonly data = signal<TodayResponse | null>(null);
  private loads = 0;
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly filters = computed<TodayFilters>(() => {
    const q = this.query();
    return { mine: q?.get('f') === 'mine', room: q?.get('room') ?? null, quick: q?.get('max') === '15' };
  });
  protected readonly filtered = computed(() => {
    const f = this.filters();
    return f.mine || !!f.room || f.quick;
  });
  protected readonly roomName = computed(() => {
    const room = this.data()?.rooms.find((r) => r.id === this.filters().room);
    return room ? `${room.emoji} ${room.name}` : 'Habitación';
  });

  protected readonly groups = computed(() => {
    const g = this.data()?.groups;
    return g
      ? [
          { key: 'overdue', name: 'Atrasadas', css: 'overdue', tasks: g.overdue },
          { key: 'today', name: 'Hoy', css: 'today', tasks: g.today },
          { key: 'upcoming', name: 'Próximos 7 días', css: '', tasks: g.upcoming },
        ].filter((x) => x.tasks.length)
      : [];
  });
  /** Nothing pending at all («Todo limpio»), or nothing that matches the filters («Sin resultados»). */
  protected readonly empty = computed(() => this.state() === 'ready' && !this.groups().length && !this.filtered());
  protected readonly noResults = computed(() => this.state() === 'ready' && !this.groups().length && this.filtered());
  protected readonly hasDetail = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.detailOpen()),
    ),
    { initialValue: this.detailOpen() },
  );

  constructor() {
    effect(() => {
      this.refresh.version(); // reload after a sheet saved (new task, task done…)
      void this.load(this.filters());
    });
  }

  protected async load(filters = this.filters()): Promise<void> {
    const load = ++this.loads;
    // Changing a filter keeps the summary and filters on screen; only the first load shows the skeleton.
    if (!this.data()) this.state.set('loading');
    try {
      const data = await this.api.get<TodayResponse>(`/today${apiQuery(filters)}`);
      if (load !== this.loads) return;
      this.data.set(data);
      this.state.set('ready');
    } catch {
      if (load === this.loads) this.state.set('error');
    }
  }

  protected open(task: TaskSummary): void {
    void this.router.navigate(['/today/tasks', task.id]);
  }

  protected complete(task: TaskSummary): void {
    void this.router.navigate([], { queryParams: { sheet: 'complete', task: task.id }, queryParamsHandling: 'merge' });
  }

  protected openSheet(sheet: string): void {
    void this.router.navigate([], { queryParams: { sheet }, queryParamsHandling: 'merge' });
  }

  /** Sets one filter in the URL (null removes it); Hoy reloads from it. */
  protected setFilter(name: 'f' | 'room' | 'max', value: string | null): void {
    void this.router.navigate([], { queryParams: { [name]: value }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected clearFilters(): void {
    void this.router.navigate([], { queryParams: { f: null, room: null, max: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected rooms(): void {
    void this.router.navigateByUrl('/rooms');
  }

  private detailOpen(): boolean {
    return /^\/today\/tasks\/[^/?#]+/.test(this.router.url);
  }
}
