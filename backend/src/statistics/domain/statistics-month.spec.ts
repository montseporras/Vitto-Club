import { StatisticsInputError } from './errors/statistics-input.error.js';
import { lastSixMonths, parseStatisticsMonth, previousMonthWindow, statisticsMonthError } from './statistics-month.js';

// 14/11/2026 15:00 en Argentina
const NOW = new Date('2026-11-14T18:00:00.000Z');

describe('statisticsMonthError — los cuatro 400 de S5 §3.9', () => {
  it.each([
    [undefined, 'Elegí un mes.'],
    ['', 'Elegí un mes.'],
    ['2026-1', 'El mes tiene que tener el formato AAAA-MM.'],
    ['2026-13', 'El mes tiene que tener el formato AAAA-MM.'],
    ['noviembre', 'El mes tiene que tener el formato AAAA-MM.'],
    ['2026-12', 'No se puede elegir un mes que todavía no empezó.'],
    ['2027-01', 'No se puede elegir un mes que todavía no empezó.'],
    ['2024-12', 'Elegí un mes desde enero de 2025.'],
    ['2020-05', 'Elegí un mes desde enero de 2025.'],
  ])('%p → %s', (raw, message) => {
    expect(statisticsMonthError(raw, NOW)).toBe(message);
  });

  it.each(['2026-11', '2026-01', '2025-01', '2025-12'])('%s es válido', (raw) => {
    expect(statisticsMonthError(raw, NOW)).toBeNull();
  });

  it('en Argentina todavía es noviembre aunque en UTC ya sea diciembre', () => {
    const lateNight = new Date('2026-12-01T01:00:00.000Z'); // 30/11 22:00 en Argentina
    expect(statisticsMonthError('2026-12', lateNight)).toBe('No se puede elegir un mes que todavía no empezó.');
    expect(statisticsMonthError('2026-11', lateNight)).toBeNull();
  });
});

describe('parseStatisticsMonth', () => {
  it('un mes cerrado va del día 1 a las 00:00 al último día a las 23:59:59, hora de Argentina', () => {
    const month = parseStatisticsMonth('2026-10', NOW);
    expect(month.start.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(month.endExclusive.toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(month.lastDay).toBe(31);
    expect(month.isCurrent).toBe(false);
    expect(month.cutoff).toEqual(month.endExclusive);
  });

  it('el mes en curso se puede elegir y se mira hasta hoy', () => {
    const month = parseStatisticsMonth('2026-11', NOW);
    expect(month.isCurrent).toBe(true);
    expect(month.cutoff).toEqual(NOW);
    expect(month.lastDay).toBe(30);
  });

  it('febrero tiene 28 días en 2026', () => {
    expect(parseStatisticsMonth('2026-02', NOW).lastDay).toBe(28);
  });

  it('un mes inválido lanza StatisticsInputError con el mensaje del contrato', () => {
    expect(() => parseStatisticsMonth(undefined, NOW)).toThrow(new StatisticsInputError('Elegí un mes.', 'month'));
  });
});

describe('previousMonthWindow — previousMonth (S5-52)', () => {
  it('mes cerrado: el mes anterior completo', () => {
    const { value, range } = previousMonthWindow(parseStatisticsMonth('2026-10', NOW), NOW);
    expect(value).toBe('2026-09');
    expect(range.from.toISOString()).toBe('2026-09-01T03:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-10-01T03:00:00.000Z');
  });

  it('mes en curso: los mismos días del anterior (del 1 al día de hoy, el 14)', () => {
    const { value, range } = previousMonthWindow(parseStatisticsMonth('2026-11', NOW), NOW);
    expect(value).toBe('2026-10');
    expect(range.from.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    // incluye todo el día 14: hasta el 15/10 00:00 (hora de Argentina)
    expect(range.to.toISOString()).toBe('2026-10-15T03:00:00.000Z');
  });

  it('mes en curso con el anterior más corto: hasta su último día', () => {
    const now = new Date('2026-03-31T15:00:00.000Z'); // 31 de marzo
    const { value, range } = previousMonthWindow(parseStatisticsMonth('2026-03', now), now);
    expect(value).toBe('2026-02');
    expect(range.from.toISOString()).toBe('2026-02-01T03:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-03-01T03:00:00.000Z');
  });

  it('enero: el anterior es diciembre del año anterior, aunque sea anterior al límite', () => {
    const { value } = previousMonthWindow(parseStatisticsMonth('2025-01', NOW), NOW);
    expect(value).toBe('2024-12');
  });
});

describe('lastSixMonths — los 6 meses que terminan en el elegido', () => {
  it('en orden y cruzando el año', () => {
    const months = lastSixMonths(parseStatisticsMonth('2026-02', NOW));
    expect(months.map((m) => m.value)).toEqual(['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']);
    expect(months[0].range.from.toISOString()).toBe('2025-09-01T03:00:00.000Z');
    expect(months[5].range.to.toISOString()).toBe('2026-03-01T03:00:00.000Z');
  });
});
