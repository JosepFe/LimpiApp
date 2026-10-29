import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { versionLine } from '../../core/build-info';
import { HouseholdApi } from '../../core/household-api';
import { InstallService } from '../../core/install';
import { Me, SessionStore } from '../../core/session.store';
import { ThemeChoice } from '../../core/theme';
import { AVATAR_COLORS, initial } from '../../shared/avatar';

const ZONES = ['Europe/Madrid', 'Atlantic/Canary'];

/** #screen-settings: profile, theme, household data, shortcuts and sign out (E07/US-001). Each change saves at once. */
@Component({
  selector: 'la-settings',
  imports: [RouterLink],
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly api = inject(HouseholdApi);
  private readonly router = inject(Router);
  protected readonly session = inject(SessionStore);
  protected readonly install = inject(InstallService);
  protected readonly colors = AVATAR_COLORS;
  protected readonly themes: { id: ThemeChoice; label: string }[] = [
    { id: 'system', label: 'Sistema' },
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Oscuro' },
  ];
  protected readonly initial = initial;
  protected readonly version = versionLine();
  protected readonly failed = signal(false);
  protected readonly productCount = signal<number | null>(null);
  protected readonly timeZone = signal<string | null>(null);
  protected readonly isOwner = computed(() => this.session.household()?.role === 'owner');
  /** The prototype's two zones, plus the household's own if it is another one. */
  protected readonly zones = computed(() => {
    const zone = this.timeZone();
    return zone && !ZONES.includes(zone) ? [zone, ...ZONES] : ZONES;
  });

  ngOnInit(): void {
    void this.api.get<unknown[]>('/products').then((p) => this.productCount.set(p.length), () => this.productCount.set(null));
    void this.api.get<{ timeZone: string }>('').then((h) => this.timeZone.set(h.timeZone), () => undefined);
  }

  protected async saveName(value: string): Promise<void> {
    const name = value.trim();
    if (!name || name === this.session.me()?.name) return;
    await this.saveMe({ name });
  }

  protected async saveColor(avatarColor: string): Promise<void> {
    if (avatarColor !== this.session.me()?.avatarColor) await this.saveMe({ avatarColor });
  }

  /** Applied before the request answers (the page changes at once); put back if it fails. */
  protected async saveTheme(theme: ThemeChoice): Promise<void> {
    const me = this.session.me();
    if (!me || theme === me.theme) return;
    this.session.me.set({ ...me, theme });
    if (!(await this.saveMe({ theme }))) this.session.me.update((m) => (m ? { ...m, theme: me.theme } : m));
  }

  protected async saveHousehold(change: { name?: string; timeZone?: string }): Promise<void> {
    const household = this.session.household();
    if (!household || !this.isOwner()) return;
    const name = change.name?.trim();
    if (change.name !== undefined && (!name || name === household.name)) return;
    if (change.timeZone !== undefined && change.timeZone === this.timeZone()) return;
    try {
      const saved = await this.api.patch<{ name: string; timeZone: string }>('', name ? { name } : change);
      this.failed.set(false);
      this.timeZone.set(saved.timeZone);
      await this.session.load();
    } catch {
      this.failed.set(true);
    }
  }

  protected async logout(): Promise<void> {
    try {
      await this.session.logout();
    } catch {
      // the session may stay on the server, but the login screen is where the person wanted to go
    }
    await this.router.navigateByUrl('/login');
  }

  private async saveMe(change: Partial<Pick<Me, 'name' | 'avatarColor' | 'theme'>>): Promise<boolean> {
    try {
      const saved = await firstValueFrom(this.http.patch<Pick<Me, 'name' | 'avatarColor' | 'theme'>>('/api/me', change));
      this.session.me.update((m) => (m ? { ...m, name: saved.name, avatarColor: saved.avatarColor, theme: saved.theme } : m));
      this.failed.set(false);
      return true;
    } catch {
      this.failed.set(true);
      return false;
    }
  }
}
