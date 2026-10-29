import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, output, signal } from '@angular/core';
import { BROWSER_SHARE } from '../../core/browser';
import { HouseholdApi } from '../../core/household-api';
import { SessionStore } from '../../core/session.store';
import { ToastService } from '../../core/toast';
import { Sheet } from '../../shared/sheet';
import { Invite as InviteData } from './household.model';

type InviteState = 'loading' | 'default' | 'copied' | 'expired' | 'error';

const DAY_MS = 24 * 60 * 60 * 1000;

/** #screen-invite «Invitar al hogar»: the household's link to copy, share, renew or revoke (E06/US-004). */
@Component({
  selector: 'la-invite',
  imports: [Sheet],
  templateUrl: './invite.html',
})
export class Invite implements OnInit {
  private readonly api = inject(HouseholdApi);
  private readonly browser = inject(BROWSER_SHARE);
  private readonly toast = inject(ToastService);
  protected readonly session = inject(SessionStore);
  readonly closed = output();
  protected readonly state = signal<InviteState>('loading');
  protected readonly invite = signal<InviteData | null>(null);
  protected readonly busy = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  /** The current link (maybe expired); a household without one gets a new one. */
  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.show(await this.api.get<InviteData>('/invites/current'));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) await this.create();
      else this.state.set('error');
    }
  }

  /** «Generar enlace nuevo» (and the first link): the API revokes the previous one. */
  protected async create(): Promise<void> {
    this.busy.set(true);
    try {
      const fresh = !!this.invite();
      this.show(await this.api.post<InviteData>('/invites', null));
      if (fresh) this.toast.show('Enlace nuevo creado');
    } catch {
      this.state.set('error');
    } finally {
      this.busy.set(false);
    }
  }

  protected async copy(): Promise<void> {
    const invite = this.invite();
    if (!invite) return;
    try {
      await this.browser.copy(invite.url);
      this.state.set('copied');
      this.toast.show('Enlace copiado');
    } catch {
      this.toast.show('No hemos podido copiar el enlace.');
    }
  }

  /** «Compartir»: the phone's share sheet; without one, copies the link (A2). */
  protected async share(): Promise<void> {
    const invite = this.invite();
    const household = this.session.household();
    if (!invite || !household) return;
    if (!this.browser.share) {
      await this.copy();
      return;
    }
    try {
      await this.browser.share({ title: 'LimpiApp', text: `Únete a ${household.name} en LimpiApp`, url: invite.url });
    } catch {
      // the person closed the share sheet
    }
  }

  protected async revoke(): Promise<void> {
    const invite = this.invite();
    if (!invite) return;
    try {
      await this.api.delete(`/invites/${invite.id}`);
      this.toast.show('Enlace revocado');
      this.closed.emit();
    } catch {
      this.toast.show('No hemos podido revocar el enlace.');
    }
  }

  /** «limpiapp.taaloss.com/join/…»: the prototype shows the link without the scheme. */
  protected display(invite: InviteData): string {
    return invite.url.replace(/^https?:\/\//, '');
  }

  protected expiry(invite: InviteData): string {
    const days = Math.max(1, Math.ceil((Date.parse(invite.expiresAt) - Date.now()) / DAY_MS));
    return `Caduca en ${days} ${days === 1 ? 'día' : 'días'}`;
  }

  private show(invite: InviteData): void {
    this.invite.set(invite);
    this.state.set(invite.expired ? 'expired' : 'default');
  }
}
