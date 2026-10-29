import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { HouseholdApi } from '../../core/household-api';
import { initial } from '../../shared/avatar';
import { shortDay } from '../../shared/dates';
import { Sheet } from '../../shared/sheet';
import { HistoryEntry as Entry, time } from './activity.model';

/** #screen-history-entry «Detalle de actividad»: who, when, what, time, note and photos of a completion (E05/US-003). */
@Component({
  selector: 'la-history-entry',
  imports: [Sheet],
  templateUrl: './history-entry.html',
})
export class HistoryEntry {
  private readonly api = inject(HouseholdApi);
  readonly entryId = input.required<string>();
  readonly closed = output();
  protected readonly entry = signal<Entry | null>(null);
  protected readonly failed = signal(false);
  protected readonly initial = initial;
  protected readonly when = (e: Entry) => `${shortDay(e.at)} · ${time(e.at)}`;
  /** Photo URLs are API paths; the browser sends the session cookie with them. */
  protected readonly photoUrl = (url: string) => `url(/api${url})`;

  constructor() {
    effect(() => {
      const id = this.entryId();
      untracked(() => void this.load(id));
    });
  }

  private async load(id: string): Promise<void> {
    try {
      this.entry.set(await this.api.get<Entry>(`/history/${id}`));
    } catch {
      this.failed.set(true);
    }
  }
}
