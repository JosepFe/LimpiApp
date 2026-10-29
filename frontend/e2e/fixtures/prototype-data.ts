// The prototype data (Design/prototype.html), also used by the tests to mock the API.
// Each story adds the data of its screens here, copied from the prototype, never invented.
export const FIXED_NOW = '2026-10-14T09:00:00+02:00'; // Wednesday 14 October 2026, 09:00 in Madrid
export const TODAY = '2026-10-14';

/** GET /auth/me: Josep, in «Casa Pau y Josep» (owner, 3 members) and «Casa de la playa» (member, 2). */
export const ME = {
  id: 'u-josep',
  email: 'josep@example.com',
  name: 'Josep',
  avatarColor: 'teal',
  theme: 'system',
  households: [
    { id: 'h-casa', name: 'Casa Pau y Josep', role: 'owner', memberCount: 3 },
    { id: 'h-playa', name: 'Casa de la playa', role: 'member', memberCount: 2 },
  ],
};

/** GET /households/h-casa/today: #screen-today (and «Hoy 6» in the navigation). Filled in at the end of this file. */
export const TODAY_SUMMARY = {
  date: '2026-10-14',
  summary: { health: { value: 78, label: 'Bien', level: 'good' }, pendingToday: 6, streak: 5 },
  groups: { overdue: [] as unknown[], today: [] as unknown[], upcoming: [] as unknown[] },
};

/** #screen-login: the email typed in the prototype. */
export const LOGIN_EMAIL = 'josep@example.com';

/** GET /templates: the 8 cards of #screen-onboarding (step-templates). */
export const TEMPLATES = [
  { id: 'kitchen', name: 'Cocina', emoji: '🍳', color: 'orange', taskCount: 6 },
  { id: 'bathroom', name: 'Baño', emoji: '🛁', color: 'blue', taskCount: 6 },
  { id: 'bedroom', name: 'Dormitorio', emoji: '🛏️', color: 'violet', taskCount: 5 },
  { id: 'living', name: 'Salón', emoji: '🛋️', color: 'green', taskCount: 4 },
  { id: 'hall', name: 'Recibidor', emoji: '🚪', color: 'slate', taskCount: 2 },
  { id: 'laundry', name: 'Lavadero', emoji: '🧺', color: 'teal', taskCount: 3 },
  { id: 'office', name: 'Despacho', emoji: '💻', color: 'amber', taskCount: 3 },
  { id: 'terrace', name: 'Terraza', emoji: '🌿', color: 'rose', taskCount: 3 },
];

/** #screen-products: in the order of the prototype, with the tasks that use each. */
export const PRODUCTS = [
  { id: 'p-desincrustante', name: 'Desincrustante', emoji: '🧴', taskCount: 3 },
  { id: 'p-fregona', name: 'Fregona', emoji: '🪣', taskCount: 4 },
  { id: 'p-bayetas', name: 'Bayetas microfibra', emoji: '🧽', taskCount: 5 },
  { id: 'p-lejia', name: 'Lejía', emoji: '🧪', taskCount: 3 },
  { id: 'p-limpiacristales', name: 'Limpiacristales', emoji: '🪟', taskCount: 2 },
  { id: 'p-aspiradora', name: 'Aspiradora', emoji: '🌀', taskCount: 4 },
];

const health = (value: number, label: string, level: string) => ({ value, label, level });
const room = (id: string, name: string, emoji: string, color: string, h: ReturnType<typeof health>, overdueCount: number, activeTaskCount: number, next: [string, string]) =>
  ({ id, name, emoji, color, zones: [] as { id: string; name: string }[], health: h, overdueCount, activeTaskCount, next: { id: `t-${id}`, when: next[0], title: next[1] } });

/** GET /households/h-casa/rooms: #screen-rooms («78 · Hogar: Bien · 6 habitaciones · 6 tareas atrasadas»). */
export const ROOMS = {
  summary: { health: health(78, 'Bien', 'good'), roomCount: 6, overdueCount: 6 },
  rooms: [
    { ...room('r-cocina', 'Cocina', '🍳', 'orange', health(62, 'Atención', 'warn'), 2, 4, ['Hoy', 'Fregar suelo']), zones: [{ id: 'z-nevera', name: 'Nevera' }, { id: 'z-horno', name: 'Horno' }] },
    room('r-bano', 'Baño', '🛁', 'blue', health(88, 'Bien', 'good'), 1, 6, ['Hoy', 'Limpiar WC']),
    room('r-dormitorio', 'Dormitorio', '🛏️', 'violet', health(95, 'Impecable', 'ok'), 0, 5, ['Hoy', 'Cambiar sábanas']),
    room('r-salon', 'Salón', '🛋️', 'green', health(71, 'Bien', 'good'), 0, 4, ['En 3 d', 'Aspirar sofá y suelo']),
    room('r-recibidor', 'Recibidor', '🚪', 'slate', health(100, 'Impecable', 'ok'), 0, 2, ['En 5 d', 'Barrer y fregar entrada']),
    room('r-terraza', 'Terraza', '🌿', 'rose', health(34, 'Urgente', 'bad'), 3, 3, ['En 6 d', 'Barrer']),
  ],
};

export const JOSEP = { id: 'u-josep', name: 'Josep', avatarColor: 'teal' };
export const PAU = { id: 'u-pau', name: 'Pau', avatarColor: 'violet' };
export const MARTA = { id: 'u-marta', name: 'Marta', avatarColor: 'amber' };

type Kind = 'overdue' | 'today' | 'soon' | 'ok';
/** A task row of the prototype (GET /tasks). */
export const taskRow = (id: string, title: string, room: [string, string, string], zone: [string, string] | null, minutes: number,
  due: [Kind, string], assignee: typeof JOSEP | null, nextDue = TODAY) => ({
  id, title, roomId: room[0], roomName: room[1], roomEmoji: room[2], zone: zone ? { id: zone[0], name: zone[1] } : null,
  estimatedMinutes: minutes, nextDue, due: { kind: due[0], label: due[1] }, assignee,
});
const COCINA: [string, string, string] = ['r-cocina', 'Cocina', '🍳'];

/** GET /households/h-casa/tasks?room=r-cocina: #screen-room-detail (Nevera, Horno, Sin zona). */
export const KITCHEN_TASKS = [
  taskRow('t-horno', 'Limpiar horno', COCINA, ['z-horno', 'Horno'], 45, ['overdue', 'Atrasada 6 d'], PAU, '2026-10-08'),
  taskRow('t-nevera', 'Limpiar nevera por dentro', COCINA, ['z-nevera', 'Nevera'], 30, ['overdue', 'Atrasada 3 d'], JOSEP, '2026-10-11'),
  taskRow('t-fregar', 'Fregar suelo', COCINA, null, 20, ['today', 'Hoy'], JOSEP),
  taskRow('t-fregadero', 'Limpiar fregadero', COCINA, null, 5, ['soon', 'En 2 d'], JOSEP, '2026-10-16'),
];

/** GET /households/h-casa: the household with its members (the task form's «Responsable»). */
export const HOUSEHOLD = {
  id: 'h-casa', name: 'Casa Pau y Josep', timeZone: 'Europe/Madrid', role: 'owner', memberCount: 3, roomCount: 6, members: [JOSEP, PAU, MARTA],
};

/** #screen-task-form (edit): «Limpiar nevera por dentro», as the prototype draws the form. */
export const FRIDGE_TASK = {
  id: 't-nevera', title: 'Limpiar nevera por dentro', roomId: 'r-cocina', roomName: 'Cocina', roomEmoji: '🍳', zone: null,
  freqValue: 1, freqUnit: 'month', nextDue: TODAY, due: { kind: 'today', label: 'Hoy' }, estimatedMinutes: 30, priority: 'medium',
  assignee: JOSEP, notes: null,
  subtasks: [{ id: 's1', title: 'Vaciar y sacar baldas' }, { id: 's2', title: 'Retirar lo caducado' }, { id: 's3', title: 'Limpiar baldas y cajones' }],
  products: [{ id: 'p-desincrustante', name: 'Desincrustante', emoji: '🧴' }, { id: 'p-bayetas', name: 'Bayetas microfibra', emoji: '🧽' }],
  lastDone: null, history: [],
};

const done = (at: string, by: typeof JOSEP, minutes: number, points: number) => ({ at, by, minutes, points });
/** #screen-task-detail: «Fregar suelo» (default), «Limpiar horno» (overdue) and «Limpiar microondas» (never-done). */
export const FLOOR_TASK = {
  id: 't-fregar', title: 'Fregar suelo', roomId: 'r-cocina', roomName: 'Cocina', roomEmoji: '🍳', zone: null,
  freqValue: 1, freqUnit: 'week', nextDue: TODAY, due: { kind: 'today', label: 'Hoy' }, estimatedMinutes: 20, priority: 'medium',
  assignee: JOSEP, notes: 'Usar la fregona de microfibra azul. Fregar primero la zona de la entrada.',
  subtasks: ['Quitar sillas y objetos del suelo', 'Barrer o aspirar', 'Fregar con producto', 'Repasar esquinas y rodapiés', 'Aclarar la fregona y secar']
    .map((title, i) => ({ id: `s${i}`, title })),
  products: [{ id: 'p-fregona', name: 'Fregona', emoji: '🪣' }, { id: 'p-aspiradora', name: 'Aspiradora', emoji: '🌀' }, { id: 'p-lejia', name: 'Lejía', emoji: '🧪' }],
  lastDone: done('2026-10-07T18:00:00Z', JOSEP, 20, 9),
  history: [
    done('2026-10-07T18:00:00Z', JOSEP, 20, 9), done('2026-09-30T18:00:00Z', PAU, 25, 9), done('2026-09-23T18:00:00Z', JOSEP, 20, 9),
    done('2026-09-16T18:00:00Z', MARTA, 15, 6), done('2026-09-09T18:00:00Z', JOSEP, 20, 9),
  ],
};
export const OVEN_TASK = { ...FLOOR_TASK, id: 't-horno', title: 'Limpiar horno', zone: { id: 'z-horno', name: 'Horno' }, nextDue: '2026-10-08', due: { kind: 'overdue', label: 'Atrasada 6 d' } };
export const MICROWAVE_TASK = { ...FLOOR_TASK, id: 't-micro', title: 'Limpiar microondas', lastDone: null, history: [] };

const BANO: [string, string, string] = ['r-bano', 'Baño', '🛁'];
const DORMITORIO: [string, string, string] = ['r-dormitorio', 'Dormitorio', '🛏️'];
const SALON: [string, string, string] = ['r-salon', 'Salón', '🛋️'];
const TERRAZA: [string, string, string] = ['r-terraza', 'Terraza', '🌿'];
/** #screen-today: Atrasadas 3, Hoy 3, Próximos 7 días 5, in the prototype's order. */
TODAY_SUMMARY.groups = {
  overdue: [
    taskRow('t-horno', 'Limpiar horno', COCINA, ['z-horno', 'Horno'], 45, ['overdue', 'Atrasada 6 d'], PAU, '2026-10-08'),
    taskRow('t-nevera', 'Limpiar nevera por dentro', COCINA, ['z-nevera', 'Nevera'], 30, ['overdue', 'Atrasada 3 d'], JOSEP, '2026-10-11'),
    taskRow('t-juntas', 'Limpiar juntas y mamparas', BANO, null, 30, ['overdue', 'Atrasada 2 d'], null, '2026-10-12'),
  ],
  today: [
    taskRow('t-wc', 'Limpiar WC', BANO, null, 8, ['today', 'Hoy'], PAU),
    taskRow('t-fregar', 'Fregar suelo', COCINA, null, 20, ['today', 'Hoy'], JOSEP),
    taskRow('t-sabanas', 'Cambiar sábanas', DORMITORIO, null, 15, ['today', 'Hoy'], MARTA),
  ],
  upcoming: [
    taskRow('t-lavabo', 'Limpiar lavabo y espejo', BANO, null, 10, ['soon', 'Mañana'], PAU, '2026-10-15'),
    taskRow('t-fregadero', 'Limpiar fregadero', COCINA, null, 5, ['soon', 'En 2 d'], JOSEP, '2026-10-16'),
    taskRow('t-sofa', 'Aspirar sofá y suelo', SALON, null, 20, ['soon', 'En 3 d'], MARTA, '2026-10-17'),
    taskRow('t-polvo', 'Quitar polvo', SALON, null, 15, ['ok', 'En 4 d'], null, '2026-10-18'),
    taskRow('t-terraza', 'Barrer terraza', TERRAZA, null, 10, ['ok', 'En 6 d'], JOSEP, '2026-10-20'),
  ],
};
