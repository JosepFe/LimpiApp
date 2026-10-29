import { byDay, dayHeader, time } from './activity.model';

describe('activity helpers', () => {
  it('day headers: Hoy, Ayer, then the weekday', () => {
    expect(dayHeader('2026-10-14', '2026-10-14')).toBe('Hoy · mié 14 oct');
    expect(dayHeader('2026-10-13', '2026-10-14')).toBe('Ayer · mar 13 oct');
    expect(dayHeader('2026-10-12', '2026-10-14')).toBe('Lunes · lun 12 oct');
  });

  it('time in Madrid and grouping by day in order', () => {
    expect(time('2026-10-13T17:42:00Z')).toBe('19:42');
    const item = (id: string, on: string) => ({ id, on }) as never;
    expect(byDay([item('a', '2026-10-14'), item('b', '2026-10-14'), item('c', '2026-10-13')]).map((d) => [d.day, d.items.length])).toEqual([
      ['2026-10-14', 2],
      ['2026-10-13', 1],
    ]);
  });
});
