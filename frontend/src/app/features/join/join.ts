import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../core/session.store';
import { ToastService } from '../../core/toast';
import { initial, members } from '../../shared/avatar';

type JoinStatus = 'valid' | 'invalid' | 'expired' | 'already-member';

/** GET /invites/{code} (E06/US-003): only a valid or already-member invite says which household. */
export interface InvitePreview {
  status: JoinStatus;
  householdId: string | null;
  householdName: string | null;
  inviterName: string | null;
  members: { name: string; avatarColor: string }[] | null;
  memberCount: number;
  roomCount: number;
}

const INVALID: InvitePreview = { status: 'invalid', householdId: null, householdName: null, inviterName: null, members: null, memberCount: 0, roomCount: 0 };

/** «Unirme al hogar» without a session: the code waits here while the person signs in (maybe in another tab). */
const PENDING_KEY = 'limpiapp.join';
const PENDING_FOR_MS = 30 * 60 * 1000;

/** #screen-join: open an invitation link and join the household, signing in first if needed (E06/US-005). */
@Component({
  selector: 'la-join',
  templateUrl: './join.html',
})
export class Join {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);
  readonly code = input.required<string>();
  protected readonly invite = signal<InvitePreview | null>(null);
  protected readonly busy = signal(false);
  protected readonly initial = initial;
  protected readonly counts = (i: InvitePreview) => `${members(i.memberCount)} · ${i.roomCount} ${i.roomCount === 1 ? 'habitación' : 'habitaciones'}`;

  constructor() {
    effect(() => {
      const code = this.code();
      untracked(() => void this.load(code));
    });
  }

  private async load(code: string): Promise<void> {
    this.invite.set(null);
    const [signedIn, invite] = await Promise.all([this.session.ensureLoaded(), this.preview(code)]);
    if (this.code() !== code) return;
    this.invite.set(invite);
    if (signedIn && invite.status === 'valid' && takePending(code)) await this.accept();
  }

  private async preview(code: string): Promise<InvitePreview> {
    try {
      return await firstValueFrom(this.http.get<InvitePreview>(`/api/invites/${encodeURIComponent(code)}`));
    } catch {
      return INVALID;
    }
  }

  protected async accept(): Promise<void> {
    if (this.busy()) return;
    const code = this.code();
    if (!this.session.me()) {
      setPending(code);
      await this.router.navigate(['/login'], { queryParams: { return: `/join/${code}` } });
      return;
    }
    this.busy.set(true);
    try {
      const joined = await firstValueFrom(this.http.post<{ householdId: string }>(`/api/invites/${encodeURIComponent(code)}/accept`, null));
      await this.session.load();
      this.session.selectHousehold(joined.householdId);
      this.toast.show('Te has unido al hogar');
      await this.router.navigateByUrl('/today');
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? (error.error as { status?: unknown } | null)?.status : undefined;
      if (status === 'already-member' || status === 'expired' || status === 'invalid') {
        this.invite.update((i) => (i ? { ...i, status } : i));
      } else {
        this.toast.show('No hemos podido unirte al hogar. Inténtalo de nuevo.');
      }
    } finally {
      this.busy.set(false);
    }
  }

  /** «Ahora no»: back to the app, or to the login without a session (like the prototype). */
  protected async notNow(): Promise<void> {
    clearPending();
    await this.router.navigateByUrl(this.session.me() ? '/today' : '/login');
  }

  /** «Ir a Hoy» / «Ir a mis hogares»: to the invite's household if I am in it, otherwise to my active one. */
  protected async goToHousehold(): Promise<void> {
    const id = this.invite()?.householdId;
    if (id && this.session.me()?.households.some((h) => h.id === id)) this.session.selectHousehold(id);
    await this.router.navigateByUrl('/today');
  }
}

function setPending(code: string): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // private mode: the person presses «Unirme al hogar» again after signing in
  }
}

function clearPending(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // nothing stored
  }
}

/** True once if this code was waiting for the sign-in (recently). */
function takePending(code: string): boolean {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null') as { code?: string; at?: number } | null;
    localStorage.removeItem(PENDING_KEY);
    return pending?.code === code && typeof pending.at === 'number' && Date.now() - pending.at < PENDING_FOR_MS;
  } catch {
    return false;
  }
}
