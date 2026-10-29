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
