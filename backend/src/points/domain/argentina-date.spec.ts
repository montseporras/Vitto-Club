import { toArgentinaDateString } from './argentina-date.js';

describe('toArgentinaDateString', () => {
  it('convierte UTC a la fecha de Argentina (UTC-3)', () => {
    expect(toArgentinaDateString(new Date('2026-11-30T12:00:00.000Z'))).toBe('2026-11-30');
  });

  it('un día que en UTC todavía no cambió, en Argentina ya es el día anterior', () => {
    // 2026-12-15T01:00:00Z - 3h = 2026-12-14T22:00:00 (hora de Argentina)
    expect(toArgentinaDateString(new Date('2026-12-15T01:00:00.000Z'))).toBe('2026-12-14');
  });

  it('medianoche UTC es las 21:00 del día anterior en Argentina', () => {
    expect(toArgentinaDateString(new Date('2026-12-15T00:00:00.000Z'))).toBe('2026-12-14');
  });
});
