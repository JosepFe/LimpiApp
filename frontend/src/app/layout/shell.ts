import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { SessionStore } from '../core/session.store';

interface NavItem {
  nav: string;
  label: string;
  icon: string;
  link: string;
  /** Routes that light up the item (Actividad: Historial and Estadísticas…). */
  match: string[];
}

export const NAV: NavItem[] = [
  { nav: 'today', label: 'Hoy', icon: 'i-today', link: '/today', match: ['/today'] },
  { nav: 'rooms', label: 'Habitaciones', icon: 'i-rooms', link: '/rooms', match: ['/rooms'] },
  { nav: 'activity', label: 'Actividad', icon: 'i-activity', link: '/history', match: ['/history', '/stats'] },
  { nav: 'household', label: 'Hogar', icon: 'i-users', link: '/ranking', match: ['/ranking', '/members'] },
  { nav: 'settings', label: 'Ajustes', icon: 'i-settings', link: '/settings', match: ['/settings', '/products', '/ui-kit'] },
];

/** Sidebar (≥ 1024 px) and bottom bar (phones) of the prototype around every signed-in screen. */
@Component({
  selector: 'la-shell',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly session = inject(SessionStore);
  protected readonly nav = NAV;
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected isActive(item: NavItem): boolean {
    const path = this.url().split(/[?#]/)[0];
    return item.match.some((m) => path === m || path.startsWith(`${m}/`));
  }
}
