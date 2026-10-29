import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type Role = 'owner' | 'member';

export interface HouseholdSummary {
  id: string;
  name: string;
  role: Role;
  memberCount: number;
}

/** GET /auth/me (E02/US-004). */
export interface Me {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  theme: 'system' | 'light' | 'dark';
  households: HouseholdSummary[];
}

/** The part of GET /households/{id}/today (E04/US-001) that the shell shows: the badge of «Hoy». */
export interface TodaySummary {
  summary: { pendingToday: number };
}

const ACTIVE_KEY = 'limpiapp.household';

/** Who is signed in, the active household and the shell counters. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly http = inject(HttpClient);
  private readonly activeId = signal<string | null>(readActive());

  readonly me = signal<Me | null>(null);
  readonly pendingToday = signal(0);
  readonly household = computed(() => {
    const households = this.me()?.households ?? [];
    return households.find((h) => h.id === this.activeId()) ?? households[0] ?? null;
  });

  async load(): Promise<void> {
    try {
      this.me.set(await firstValueFrom(this.http.get<Me>('/api/auth/me')));
      await this.loadCounters();
    } catch {
      // Not signed in or API down: the shell stays empty (the login guard arrives with E02/US-004).
      this.me.set(null);
    }
  }

  selectHousehold(id: string): void {
    this.activeId.set(id);
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      // private mode: only for this visit
    }
    void this.loadCounters();
  }

  private async loadCounters(): Promise<void> {
    const household = this.household();
    if (!household) return;
    const today = await firstValueFrom(this.http.get<TodaySummary>(`/api/households/${household.id}/today`));
    this.pendingToday.set(today.summary.pendingToday);
  }
}

function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}
