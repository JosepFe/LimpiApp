import { Health } from '../../shared/health-ring';
import { TaskSummary } from '../../shared/task.model';

/** GET /households/{id}/today (E04/US-001). */
export interface TodayResponse {
  date: string;
  summary: { health: Health | null; pendingToday: number; streak: number };
  groups: { overdue: TaskSummary[]; today: TaskSummary[]; upcoming: TaskSummary[] };
  rooms: { id: string; name: string; emoji: string }[];
}

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «Miércoles 14 de octubre» for yyyy-mm-dd. */
export function longDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}

/** The filters of Hoy, kept in the URL (`?f=mine&room=…&max=15`) so they survive a reload. */
export interface TodayFilters {
  mine: boolean;
  room: string | null;
  quick: boolean;
}

export function apiQuery(f: TodayFilters): string {
  const q = [f.mine ? 'filter=mine' : '', f.room ? `room=${f.room}` : '', f.quick ? 'max=15' : ''].filter(Boolean).join('&');
  return q ? `?${q}` : '';
}
