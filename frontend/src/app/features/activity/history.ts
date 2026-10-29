import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { RefreshBus } from '../../core/refresh-bus';
import { initial } from '../../shared/avatar';
import { ErrorState, LoadState, SkeletonList } from '../../shared/states';
import { byDay, dayHeader, HistoryItem, HistoryPage, time } from './activity.model';
import { HistoryEntry } from './history-entry';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** #screen-history: what was done, by day, filtered by person and room (E05/US-002). Filters live in the URL. */
@Component({
  selector: 'la-history',
  imports: [RouterLink, SkeletonList, ErrorState, HistoryEntry],
  templateUrl: './history.html',
})
export class History {
  private readonly api = inject(HouseholdApi);
  private readonly router = inject(Router);
  private readonly refresh = inject(RefreshBus);
  protected readonly initial = initial;
  protected readonly time = time;
  protected readonly state = signal<LoadState>('loading');
  protected readonly page = signal<HistoryPage | null>(null);
  protected readonly items = signal<HistoryItem[]>([]);
  protected readonly loadingMore = signal(false);
  private loads = 0;

  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly filters = computed(
    () => {
      const room = this.query()?.get('room') ?? null;
      return { mine: this.query()?.get('mine') === '1', room: room && GUID.test(room) ? room : null };
    },
    { equal: (a, b) => a.mine === b.mine && a.room === b.room },
  );
  protected readonly entry = computed(() => (this.query()?.get('sheet') === 'history-entry' ? this.query()?.get('entry') ?? null : null));
  protected readonly filtered = computed(() => this.filters().mine || !!this.filters().room);
  protected readonly days = computed(() => byDay(this.items()));
  protected readonly roomLabel = computed(() => {
    const room = this.page()?.rooms.find((r) => r.id === this.filters().room);
    return room ? `${room.emoji} ${room.name}` : 'Habitación';
  });

  constructor() {
    effect(() => {
      this.refresh.version(); // an undo from the entry sheet
      const filters = this.filters();
      untracked(() => void this.load(filters));
    });
  }

  protected header(day: string): string {
    return dayHeader(day, this.page()!.today);
  }

  protected async load(filters = this.filters()): Promise<void> {
    const load = ++this.loads;
    if (!this.page()) this.state.set('loading');
    try {
      const page = await this.api.get<HistoryPage>(`/history${this.queryOf(filters)}`);
      if (load !== this.loads) return;
      this.page.set(page);
      this.items.set(page.items);
      this.state.set('ready');
    } catch {
      if (load === this.loads) this.state.set('error');
    }
  }

  protected async more(): Promise<void> {
    const cursor = this.page()?.nextCursor;
    if (!cursor) return;
    this.loadingMore.set(true);
    try {
      const page = await this.api.get<HistoryPage>(`/history${this.queryOf(this.filters(), cursor)}`);
      this.page.set(page);
      this.items.update((list) => [...list, ...page.items]);
    } finally {
      this.loadingMore.set(false);
    }
  }

  protected setFilter(name: 'mine' | 'room', value: string | null): void {
    void this.router.navigate([], { queryParams: { [name]: value || null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected clearFilters(): void {
    void this.router.navigate([], { queryParams: { mine: null, room: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected open(item: HistoryItem): void {
    void this.router.navigate([], { queryParams: { sheet: 'history-entry', entry: item.id }, queryParamsHandling: 'merge' });
  }

  protected closeEntry(): void {
    void this.router.navigate([], { queryParams: { sheet: null, entry: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private queryOf(f: { mine: boolean; room: string | null }, cursor?: string): string {
    const q = [f.mine ? 'mine=true' : '', f.room ? `room=${f.room}` : '', cursor ? `cursor=${encodeURIComponent(cursor)}` : ''].filter(Boolean).join('&');
    return q ? `?${q}` : '';
  }
}
