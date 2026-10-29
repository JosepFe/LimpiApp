import { Component, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { HouseholdApi } from '../../core/household-api';
import { HealthRing } from '../../shared/health-ring';
import { ErrorState, LoadState, SkeletonList } from '../../shared/states';
import { plural, RoomsResponse } from './rooms.model';

/**
 * #screen-rooms: the household's health and every room with its own (E03/US-005). On desktop the room detail opens
 * in the right pane (child route /rooms/:id); on phones it replaces the list, as its own screen in the prototype.
 */
@Component({
  selector: 'la-rooms',
  imports: [RouterOutlet, HealthRing, SkeletonList, ErrorState],
  templateUrl: './rooms.html',
  styles: `
    @media (max-width: 1023px) {
      .twopane.has-detail > .pane-list { display: none; }
      .twopane.has-detail > .pane-detail { display: block; }
    }
  `,
})
export class Rooms implements OnInit {
  private readonly api = inject(HouseholdApi);
  private readonly router = inject(Router);
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

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.data.set(await this.api.get<RoomsResponse>('/rooms'));
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }

  protected open(id: string): void {
    void this.router.navigate(['/rooms', id]);
  }

  protected newRoom(): void {
    void this.router.navigate([], { queryParams: { sheet: 'room-new' } });
  }

  private detailOpen(): boolean {
    return /^\/rooms\/[^/?#]+/.test(this.router.url);
  }
}
