import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { SessionStore } from '../../core/session.store';
import { initial } from '../../shared/avatar';
import { ErrorState, LoadState, SkeletonList } from '../../shared/states';
import { PERIODS, Ranking as RankingData, RankingPeriod, RankingRow } from './household.model';

/** #screen-ranking: podium and rows by week, month or all time, with the household's streak (E06/US-006). */
@Component({
  selector: 'la-ranking',
  imports: [RouterLink, SkeletonList, ErrorState],
  templateUrl: './ranking.html',
})
export class Ranking implements OnInit {
  private readonly api = inject(HouseholdApi);
  private readonly session = inject(SessionStore);
  protected readonly periods = PERIODS;
  protected readonly period = signal<RankingPeriod>('week');
  protected readonly state = signal<LoadState>('loading');
  protected readonly data = signal<RankingData | null>(null);
  /** The prototype's podium order: 2nd, 1st, 3rd. */
  protected readonly podium = computed(() => {
    const rows = this.data()?.rows ?? [];
    return [1, 0, 2].filter((i) => i < rows.length).map((i) => ({ row: rows[i], place: i + 1 }));
  });
  protected readonly initial = initial;
  private loadToken = 0;

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    const token = ++this.loadToken;
    const period = this.period();
    // Changing period keeps the screen (only the first load and «Reintentar» show the skeleton).
    if (!this.data() || this.state() === 'error') this.state.set('loading');
    try {
      const data = await this.api.get<RankingData>(`/ranking?period=${period}`);
      if (token !== this.loadToken) return;
      this.data.set(data);
      this.state.set('ready');
    } catch {
      if (token === this.loadToken) this.state.set('error');
    }
  }

  protected choose(period: RankingPeriod): void {
    if (period === this.period()) return;
    this.period.set(period);
    void this.load();
  }

  protected isMe(row: RankingRow): boolean {
    return row.id === this.session.me()?.id;
  }

  protected streak(days: number): string {
    return `🔥 Racha del hogar: ${days} ${days === 1 ? 'día' : 'días'}`;
  }

  protected tasks(count: number): string {
    return `${count} ${count === 1 ? 'tarea' : 'tareas'}`;
  }
}
