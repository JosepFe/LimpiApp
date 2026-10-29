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
