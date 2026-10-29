import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from './session.store';

/** Requests to the active household (`/api/households/{id}/…`); the screens only exist with one (householdGuard). */
@Injectable({ providedIn: 'root' })
export class HouseholdApi {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionStore);

  url(path: string): string {
    const household = this.session.household();
    if (!household) throw new Error('No active household');
    return `/api/households/${household.id}${path}`;
  }

  get<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.url(path)));
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.url(path), body));
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.patch<T>(this.url(path), body));
  }

  delete(path: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(this.url(path)));
  }
}
