import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

/** Chrome/Edge/Android only (A1): the event that lets the page offer «Instalar». Not in the DOM typings. */
export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * «Instala LimpiApp» (E07/US-002). The browser fires `beforeinstallprompt` once, maybe before Ajustes opens,
 * so it is kept here from the start (created by App). Installed (or no event) → no banner.
 */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private readonly event = signal<InstallPromptEvent | null>(null);
  readonly available = () => this.event() !== null;

  constructor() {
    const window = inject(DOCUMENT).defaultView;
    window?.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // our banner instead of the browser's mini-infobar
      this.event.set(e as InstallPromptEvent);
    });
    window?.addEventListener('appinstalled', () => this.event.set(null));
  }

  async install(): Promise<void> {
    const event = this.event();
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    // Each event prompts only once: after a «no», the browser fires a new one when it wants to offer it again.
    this.event.set(null);
  }
}
