/** A person on a task (assignee, who did it). */
export interface Person {
  id: string;
  name: string;
  avatarColor: string;
}

/** `kind` is the badge class of the prototype: overdue · today · soon · ok. */
export interface Due {
  kind: 'overdue' | 'today' | 'soon' | 'ok';
  label: string;
}

/** GET /households/{id}/tasks (E03/US-003). */
export interface TaskSummary {
  id: string;
  title: string;
  roomId: string;
  roomName: string;
  roomEmoji: string;
  zone: { id: string; name: string } | null;
  estimatedMinutes: number;
  nextDue: string;
  due: Due;
  assignee: Person | null;
}

export type FrequencyUnit = 'day' | 'week' | 'month';
export type Priority = 'low' | 'medium' | 'high';

/** One of «Últimas veces» (E04 fills it). */
export interface Done {
  at: string;
  by: Person;
  minutes: number;
  points: number;
}

/** GET /households/{id}/tasks/{taskId}. */
export interface TaskDetail {
  id: string;
  title: string;
  roomId: string;
  roomName: string;
  roomEmoji: string;
  zone: { id: string; name: string } | null;
  freqValue: number;
  freqUnit: FrequencyUnit;
  nextDue: string;
  due: Due;
  estimatedMinutes: number;
  priority: Priority;
  assignee: Person | null;
  notes: string | null;
  subtasks: { id: string; title: string }[];
  products: { id: string; name: string; emoji: string }[];
  lastDone: Done | null;
  history: Done[];
}

export const UNIT_LABELS: Record<FrequencyUnit, [string, string]> = { day: ['día', 'días'], week: ['semana', 'semanas'], month: ['mes', 'meses'] };
export const PRIORITY_LABELS: Record<Priority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
