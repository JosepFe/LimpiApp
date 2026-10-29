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

/** GET /households/h-casa/today, the part the shell uses: «Hoy 6» in the navigation. Completed by E04/US-001. */
export const TODAY_SUMMARY = { summary: { pendingToday: 6 } };

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
