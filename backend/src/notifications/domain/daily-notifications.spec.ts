import {
  argentinaDayOf,
  argentinaYearPeriod,
  BIRTHDAY_GREETING_WITHOUT_GIFT,
  birthdayDatesFor,
  formatArgentinaDate,
  formatPointsValue,
  isLeapYear,
} from './daily-notifications.js';

describe('argentinaDayOf (CA-48.1)', () => {
  it('es el día en hora de Argentina, no en UTC', () => {
    // 02:00 UTC del 14/11 son las 23:00 del 13/11 en Argentina
    expect(argentinaDayOf(new Date('2026-11-14T02:00:00.000Z'))).toEqual({ year: 2026, month: 11, day: 13 });
    // 03:00 UTC ya es el 14/11 00:00 en Argentina
    expect(argentinaDayOf(new Date('2026-11-14T03:00:00.000Z'))).toEqual({ year: 2026, month: 11, day: 14 });
  });

  it('cambia de año con la hora de Argentina', () => {
    expect(argentinaDayOf(new Date('2027-01-01T02:59:59.000Z'))).toEqual({ year: 2026, month: 12, day: 31 });
    expect(argentinaDayOf(new Date('2027-01-01T03:00:00.000Z'))).toEqual({ year: 2027, month: 1, day: 1 });
  });
});

describe('isLeapYear', () => {
  it.each([
    [2024, true],
    [2028, true],
    [2000, true],
    [1900, false],
    [2100, false],
    [2026, false],
    [2027, false],
  ])('%i es bisiesto: %s', (year, expected) => {
    expect(isLeapYear(year)).toBe(expected);
  });
});

describe('birthdayDatesFor (CA-48.1, contrato S5 §3.8.1)', () => {
  it('un día común: cumplen los que nacieron ese mes y día', () => {
    expect(birthdayDatesFor({ year: 2026, month: 11, day: 13 })).toEqual([{ month: 11, day: 13 }]);
  });

  it('el 28/02 de un año que no es bisiesto, cumplen también los del 29/02', () => {
    expect(birthdayDatesFor({ year: 2026, month: 2, day: 28 })).toEqual([
      { month: 2, day: 28 },
      { month: 2, day: 29 },
    ]);
    expect(birthdayDatesFor({ year: 2100, month: 2, day: 28 })).toHaveLength(2);
  });

  it('el 28/02 de un año bisiesto, solo los del 28/02; los del 29/02 cumplen el 29', () => {
    expect(birthdayDatesFor({ year: 2028, month: 2, day: 28 })).toEqual([{ month: 2, day: 28 }]);
    expect(birthdayDatesFor({ year: 2028, month: 2, day: 29 })).toEqual([{ month: 2, day: 29 }]);
  });

  it('el 01/03 no incluye a los del 29/02', () => {
    expect(birthdayDatesFor({ year: 2026, month: 3, day: 1 })).toEqual([{ month: 3, day: 1 }]);
  });
});

describe('argentinaYearPeriod (CA-48.5)', () => {
  it('es el año calendario en hora de Argentina, [from, to)', () => {
    const period = argentinaYearPeriod(2026);

    expect(period.from).toEqual(new Date('2026-01-01T03:00:00.000Z'));
    expect(period.to).toEqual(new Date('2027-01-01T03:00:00.000Z'));
  });
});

describe('BIRTHDAY_GREETING_WITHOUT_GIFT (decisión de Montse)', () => {
  it('es solo el saludo y no menciona puntos ni usa otra variable que {nombre}', () => {
    expect(BIRTHDAY_GREETING_WITHOUT_GIFT).toEqual({ subject: '¡Feliz cumpleaños!', body: '¡Feliz cumpleaños, {nombre}!' });
    expect(BIRTHDAY_GREETING_WITHOUT_GIFT.body.toLowerCase()).not.toContain('pts');
    expect(BIRTHDAY_GREETING_WITHOUT_GIFT.body.match(/\{[^}]*\}/g)).toEqual(['{nombre}']);
  });
});

describe('formato de los valores de las variables', () => {
  it('los puntos van con punto de miles, como en la pantalla', () => {
    expect(formatPointsValue(120)).toBe('120');
    expect(formatPointsValue(1250)).toBe('1.250');
    expect(formatPointsValue(1000000)).toBe('1.000.000');
  });

  it('las fechas van dd/mm/aaaa en hora de Argentina', () => {
    expect(formatArgentinaDate(new Date('2026-11-19T15:00:00.000Z'))).toBe('19/11/2026');
    // 01:00 UTC del 20/11 es todavía el 19/11 en Argentina
    expect(formatArgentinaDate(new Date('2026-11-20T01:00:00.000Z'))).toBe('19/11/2026');
  });
});
