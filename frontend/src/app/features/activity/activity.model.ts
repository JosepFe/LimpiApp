import { shortDay } from '../../shared/dates';
import { Person } from '../../shared/task.model';

/** GET /households/{id}/history (E05/US-001). */
export interface HistoryItem {
  id: string;
  at: string;
  on: string;
  by: Person;
  taskId: string;
  taskTitle: string;
  roomName: string;
  roomEmoji: string;
  minutes: number;
  points: number;
  note: string | null;
  photoCount: number;
  undone: boolean;
}

export interface HistoryPage {
  today: string;
  items: HistoryItem[];
  nextCursor: string | null;
  rooms: { id: string; name: string; emoji: string }[];
}

/** GET /households/{id}/history/{entryId}. */
export interface HistoryEntry {
  id: string;
  at: string;
  by: Person;
  taskId: string;
  taskTitle: string;
  roomName: string;
  roomEmoji: string;
  subtasksDone: number;
  subtasksTotal: number;
  minutes: number;
  points: number;
  note: string | null;
  photos: { id: string; url: string }[];
  undone: boolean;
  mine: boolean;
}

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** «Hoy · mié 14 oct», «Ayer · mar 13 oct», «Lunes · lun 12 oct» (the household's day from the API). */
export function dayHeader(day: string, today: string): string {
  const diff = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86_400_000);
  const name = diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()];
  return `${name} · ${shortDay(day)}`;
}

const TIME = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

/** «19:42» in Madrid. */
export const time = (iso: string) => TIME.format(new Date(iso));

/** Items grouped by day, in the order they come. */
export function byDay(items: HistoryItem[]): { day: string; items: HistoryItem[] }[] {
  const days: { day: string; items: HistoryItem[] }[] = [];
  for (const item of items) {
    const last = days.at(-1);
    if (last?.day === item.on) last.items.push(item);
    else days.push({ day: item.on, items: [item] });
  }
  return days;
}
