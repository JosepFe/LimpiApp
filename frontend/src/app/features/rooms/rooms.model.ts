import { Health } from '../../shared/health-ring';

export interface Zone {
  id: string;
  name: string;
}

/** GET /households/{id}/rooms (E03/US-001). */
export interface Room {
  id: string;
  name: string;
  emoji: string;
  color: string;
  zones: Zone[];
  health: Health | null;
  overdueCount: number;
  activeTaskCount: number;
  next: { id: string; title: string; when: string } | null;
}

export interface RoomsResponse {
  summary: { health: Health | null; roomCount: number; overdueCount: number };
  rooms: Room[];
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
