const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const PARTS = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Madrid' });

/** The calendar day in Madrid of an ISO date («2026-10-07») or instant. */
function madridDay(iso: string): Date {
  if (iso.length === 10) return new Date(`${iso}T12:00:00Z`);
  return new Date(`${PARTS.format(new Date(iso))}T12:00:00Z`);
}

/** «mié 7 oct»: the prototype's short form (Intl writes «sept» and adds a comma). */
export function shortDay(iso: string): string {
  const d = madridDay(iso);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** «2 mar 2026»: day, short month and year («Desde 2 mar 2026» in Miembros). */
export function dayMonthYear(iso: string): string {
  const d = madridDay(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
