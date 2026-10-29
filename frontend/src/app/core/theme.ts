import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { SessionStore } from './session.store';

export type ThemeChoice = 'system' | 'light' | 'dark';

/**
 * The user's theme as `data-theme` on <html> (E07 D3). The styles only have a dark variant, so «Sistema» follows
 * `prefers-color-scheme` here, also when the phone changes it. Changing it never reloads the page.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly session = inject(SessionStore);
  private readonly media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  private readonly systemDark = signal(this.media?.matches ?? false);

  constructor() {
    this.media?.addEventListener('change', (e) => this.systemDark.set(e.matches));
    effect(() => {
      const choice = this.session.me()?.theme ?? 'system';
      const dark = choice === 'dark' || (choice === 'system' && this.systemDark());
      if (dark) this.root.setAttribute('data-theme', 'dark');
      else this.root.removeAttribute('data-theme');
    });
  }
}
