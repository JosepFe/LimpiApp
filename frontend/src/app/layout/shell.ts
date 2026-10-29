import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { SessionStore } from '../core/session.store';
import { avatarColor, members } from '../shared/avatar';
import { HomeSwitcher } from './home-switcher';

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
  imports: [RouterOutlet, RouterLink, HomeSwitcher],
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly session = inject(SessionStore);
  protected readonly nav = NAV;
  protected readonly members = members;
  /** Same colour as in «Mis hogares»: by the household's position in the user's list. */
  protected readonly householdColor = computed(() => {
    const households = this.session.me()?.households ?? [];
    return avatarColor(Math.max(0, households.findIndex((h) => h.id === this.session.household()?.id)));
  });
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Sheets open over the current screen with `?sheet=…`: shareable, and the back button closes them. */
  protected readonly sheet = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map((p) => p.get('sheet'))));

  protected openSheet(name: string): void {
    void this.router.navigate([], { queryParams: { sheet: name }, queryParamsHandling: 'merge' });
  }

  protected closeSheet(): void {
    void this.router.navigate([], { queryParams: { sheet: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected isActive(item: NavItem): boolean {
    const path = this.url().split(/[?#]/)[0];
    return item.match.some((m) => path === m || path.startsWith(`${m}/`));
  }
}
