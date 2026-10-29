import { Health } from '../../shared/health-ring';
import { TaskSummary } from '../../shared/task.model';

/** GET /households/{id}/today (E04/US-001). */
export interface TodayResponse {
  date: string;
  summary: { health: Health | null; pendingToday: number; streak: number };
  groups: { overdue: TaskSummary[]; today: TaskSummary[]; upcoming: TaskSummary[] };
}

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «Miércoles 14 de octubre» for yyyy-mm-dd. */
export function longDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}
