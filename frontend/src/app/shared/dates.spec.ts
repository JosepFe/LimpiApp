import { dayMonthYear, shortDay } from './dates';

describe('shortDay', () => {
  it('writes «mié 7 oct» from a date or an instant (in Madrid)', () => {
    expect(shortDay('2026-10-07')).toBe('mié 7 oct');
    expect(shortDay('2026-09-30T18:00:00Z')).toBe('mié 30 sep');
    expect(shortDay('2026-10-13T23:30:00Z')).toBe('mié 14 oct');
  });
});

describe('dayMonthYear', () => {
  it('writes «2 mar 2026»', () => {
    expect(dayMonthYear('2026-03-02')).toBe('2 mar 2026');
    expect(dayMonthYear('2025-12-31T23:30:00Z')).toBe('1 ene 2026');
  });
});
