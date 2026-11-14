import { argentinaMonthStart, toArgentinaDateString, toArgentinaParts } from './argentina-date.js';

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

describe('toArgentinaParts / argentinaMonthStart', () => {
  it('a las 01:00 UTC del 1 de diciembre todavía es 30 de noviembre en Argentina', () => {
    expect(toArgentinaParts(new Date('2026-12-01T01:00:00.000Z'))).toEqual({ year: 2026, month: 11, day: 30 });
  });

  it('el mes empieza a las 03:00 UTC del día 1', () => {
    expect(argentinaMonthStart(2026, 11).toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });

  it('acepta el mes 13 (enero siguiente) y el 0 (diciembre anterior)', () => {
    expect(argentinaMonthStart(2026, 13).toISOString()).toBe('2027-01-01T03:00:00.000Z');
    expect(argentinaMonthStart(2026, 0).toISOString()).toBe('2025-12-01T03:00:00.000Z');
  });
});
