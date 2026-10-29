import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** #screen-login: Google or an emailed link, no passwords (E02/US-002, US-003). */
@Component({
  selector: 'la-login',
  templateUrl: './login.html',
})
export class Login {
  private readonly http = inject(HttpClient);

  /** `?error=link|google`: the API sends the browser back here when signing in failed. */
  readonly error = input<string>();
  /** `?return=/join/…`: where to go after signing in. */
  readonly return = input<string>();

  protected readonly email = signal('');
  protected readonly busy = signal(false);
  protected readonly sentTo = signal<string | null>(null);
  private readonly failed = signal(false);
  protected readonly showError = computed(() => this.failed() || !!this.error());

  protected async sendLink(event: Event): Promise<void> {
    event.preventDefault();
    const email = this.email().trim();
    if (!email || this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    try {
      await firstValueFrom(this.http.post('/api/auth/magic-link', { email, returnUrl: this.return() ?? null }));
      this.sentTo.set(email);
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  protected useAnotherEmail(): void {
    this.sentTo.set(null);
  }
}
