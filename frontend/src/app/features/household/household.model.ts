import type { Role } from '../../core/session.store';

/** GET /households/{id}/members (E06/US-001). `joinedOn` is the day in the household time zone. */
export interface Member {
  id: string;
  name: string;
  avatarColor: string;
  role: Role;
  joinedOn: string;
}

export const ROLE_LABEL: Record<Role, string> = { owner: 'Propietario', member: 'Miembro' };

export type RankingPeriod = 'week' | 'month' | 'all';

/** GET /households/{id}/ranking?period=… (E06/US-006): rows by points, then by name. */
export interface Ranking {
  period: RankingPeriod;
  householdStreak: number;
  hasPoints: boolean;
  rows: RankingRow[];
}

export interface RankingRow {
  id: string;
  name: string;
  avatarColor: string;
  points: number;
  tasks: number;
  streak: number;
}

export const PERIODS: { id: RankingPeriod; label: string }[] = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'all', label: 'Total' },
];
