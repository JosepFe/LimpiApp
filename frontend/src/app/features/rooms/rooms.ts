import { Component, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { HouseholdApi } from '../../core/household-api';
import { RefreshBus } from '../../core/refresh-bus';
import { HealthRing } from '../../shared/health-ring';
import { ErrorState, LoadState, SkeletonList } from '../../shared/states';
import { RoomForm } from './room-form';
import { plural, RoomsResponse } from './rooms.model';

/**
 * #screen-rooms: the household's health and every room with its own (E03/US-005). On desktop the room detail opens
 * in the right pane (child route /rooms/:id); on phones it replaces the list, as its own screen in the prototype.
 */
@Component({
  selector: 'la-rooms',
  imports: [RouterOutlet, HealthRing, SkeletonList, ErrorState, RoomForm],
  templateUrl: './rooms.html',
  styles: `
    @media (max-width: 1023px) {
      .twopane.has-detail > .pane-list { display: none; }
      .twopane.has-detail > .pane-detail { display: block; }
    }
  `,
})
export class Rooms {
  private readonly api = inject(HouseholdApi);
  private readonly router = inject(Router);
  private readonly refresh = inject(RefreshBus);
  private loads = 0;
  protected readonly plural = plural;
  protected readonly state = signal<LoadState>('loading');
  protected readonly data = signal<RoomsResponse | null>(null);
  protected readonly hasDetail = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.detailOpen()),
    ),
    { initialValue: this.detailOpen() },
  );

  /** The room form opens over the list: `?sheet=room-new` or `?sheet=room-edit&room=<id>` (from the detail). */
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly sheet = () => this.query()?.get('sheet') ?? null;
  protected readonly editRoom = () => this.query()?.get('room') ?? null;

  constructor() {
    // Loads, and reloads when a sheet saved something (a task from the detail pane, a room…).
    effect(() => {
      this.refresh.version();
      untracked(() => void this.load()); // load() reads other signals: they must not become dependencies
    });
  }

  protected async load(): Promise<void> {
    const load = ++this.loads; // a slower earlier answer must not overwrite a newer one
    this.state.set('loading');
    try {
      const data = await this.api.get<RoomsResponse>('/rooms');
      if (load !== this.loads) return;
      this.data.set(data);
      this.state.set('ready');
    } catch {
      if (load === this.loads) this.state.set('error');
    }
  }

  protected open(id: string): void {
    void this.router.navigate(['/rooms', id]);
  }

  protected newRoom(): void {
    void this.router.navigate([], { queryParams: { sheet: 'room-new' } });
  }

  protected closeSheet(): void {
    void this.router.navigate([], { queryParams: { sheet: null, room: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  /** Saved or archived: the list and an open detail reload. */
  protected async roomChanged(change: { archived: boolean }): Promise<void> {
    if (change.archived) await this.router.navigate(['/rooms'], { replaceUrl: true });
    else this.closeSheet();
    this.refresh.bump();
  }

  private detailOpen(): boolean {
    return /^\/rooms\/[^/?#]+/.test(this.router.url);
  }
}
