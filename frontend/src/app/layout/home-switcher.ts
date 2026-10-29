import { HttpClient } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BROWSER_PROMPT } from '../core/browser';
import { SessionStore } from '../core/session.store';
import { Sheet } from '../shared/sheet';
import { avatarColor, initial, members } from '../shared/avatar';

/** #screen-home-switcher «Mis hogares»: change household, create another or join one with a link (E02/US-008). */
@Component({
  selector: 'la-home-switcher',
  imports: [Sheet],
  templateUrl: './home-switcher.html',
})
export class HomeSwitcher {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly prompt = inject(BROWSER_PROMPT);
  protected readonly session = inject(SessionStore);
  protected readonly avatarColor = avatarColor;
  protected readonly initial = initial;
  protected readonly members = members;
  readonly closed = output();

  protected readonly creating = signal(false);
  protected readonly name = signal('');
  protected readonly nameMissing = signal(false);
  protected readonly saving = signal(false);

  protected async choose(id: string): Promise<void> {
    this.session.selectHousehold(id);
    this.closed.emit();
    await this.router.navigateByUrl('/today');
  }

  protected async create(): Promise<void> {
    const name = this.name().trim();
    if (!name) {
      this.nameMissing.set(true);
      return;
    }
    this.saving.set(true);
    try {
      const created = await firstValueFrom(this.http.post<{ id: string }>('/api/households', { name, templates: [] }));
      await this.session.load();
      await this.choose(created.id);
    } finally {
      this.saving.set(false);
    }
  }

  /** «Unirme con enlace»: the invitation link (or just its code) opens /join/<code> (E06/US-005). */
  protected async join(): Promise<void> {
    const pasted = this.prompt('Pega el enlace de invitación')?.trim();
    const code = pasted?.split('/join/').pop()?.split(/[?#/]/)[0];
    if (!code) return;
    this.closed.emit();
    await this.router.navigate(['/join', code]);
  }
}
