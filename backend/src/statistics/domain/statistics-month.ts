import { argentinaMonthStart, toArgentinaParts } from '../../shared/time/argentina-date.js';
import { StatisticsInputError } from './errors/statistics-input.error.js';

// S5 §3.9: el período de las estadísticas es un mes (`YYYY-MM`, hora de Argentina). Se toman los datos
// del día 1 a las 00:00 al último día a las 23:59:59: [start, endExclusive).
export const MONTH_MESSAGES = {
  missing: 'Elegí un mes.',
  format: 'El mes tiene que tener el formato AAAA-MM.',
  future: 'No se puede elegir un mes que todavía no empezó.',
  tooOld: (year: number) => `Elegí un mes desde enero de ${year}.`,
} as const;

const MONTH_FORMAT = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type DateRange = { from: Date; to: Date };

export type StatisticsMonth = {
  // `YYYY-MM`
  value: string;
  year: number;
  // 1–12
  month: number;
  start: Date;
  endExclusive: Date;
  lastDay: number;
  // Es el mes en curso: trae lo que va del mes
  isCurrent: boolean;
  // Hasta cuándo se mira el mes: hoy si es el mes en curso, si no el final del mes
  cutoff: Date;
};

const monthValue = (year: number, month: number): string => `${year}-${String(month).padStart(2, '0')}`;

// Normaliza (year, month) fuera de 1–12: (2026, 0) → (2025, 12)
function normalize(year: number, month: number): { year: number; month: number } {
  const index = year * 12 + (month - 1);
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function buildMonth(year: number, month: number, now: Date): StatisticsMonth {
  const start = argentinaMonthStart(year, month);
  const endExclusive = argentinaMonthStart(year, month + 1);
  const today = toArgentinaParts(now);
  const isCurrent = today.year === year && today.month === month;
  return {
    value: monthValue(year, month),
    year,
    month,
    start,
    endExclusive,
    lastDay: new Date(Date.UTC(year, month, 0)).getUTCDate(),
    isCurrent,
    cutoff: isCurrent ? now : endExclusive,
  };
}

// Mensaje del primer problema del mes, o null si es válido. Orden: falta, formato, futuro, muy viejo.
export function statisticsMonthError(raw: unknown, now: Date): string | null {
  if (raw === undefined || raw === null || raw === '') return MONTH_MESSAGES.missing;
  if (typeof raw !== 'string') return MONTH_MESSAGES.format;
  const match = MONTH_FORMAT.exec(raw);
  if (!match) return MONTH_MESSAGES.format;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const today = toArgentinaParts(now);
  if (year * 12 + month > today.year * 12 + today.month) return MONTH_MESSAGES.future;
  // Desde enero del año pasado (la pantalla ofrece el año actual y el anterior)
  if (year < today.year - 1) return MONTH_MESSAGES.tooOld(today.year - 1);
  return null;
}

export function parseStatisticsMonth(raw: unknown, now: Date): StatisticsMonth {
  const error = statisticsMonthError(raw, now);
  if (error) throw new StatisticsInputError(error, 'month');
  const [year, month] = (raw as string).split('-').map(Number);
  return buildMonth(year, month, now);
}

// El mes anterior completo (mes cerrado) o, en el mes en curso, los MISMOS DÍAS: del 1 al día de hoy, o
// hasta el último día del mes anterior si es más corto (S5-52). Se calcula aunque sea anterior al
// límite de enero del año pasado.
export function previousMonthWindow(month: StatisticsMonth, now: Date): { value: string; range: DateRange } {
  const previous = normalize(month.year, month.month - 1);
  const from = argentinaMonthStart(previous.year, previous.month);
  const wholeMonth = month.start;
  if (!month.isCurrent) {
    return { value: monthValue(previous.year, previous.month), range: { from, to: wholeMonth } };
  }
  const previousLastDay = new Date(Date.UTC(previous.year, previous.month, 0)).getUTCDate();
  const days = Math.min(toArgentinaParts(now).day, previousLastDay);
  return {
    value: monthValue(previous.year, previous.month),
    range: { from, to: new Date(from.getTime() + days * 24 * 60 * 60 * 1000) },
  };
}

// Los 6 meses que terminan en el elegido (incluido), en orden (S5-53)
export function lastSixMonths(month: StatisticsMonth): { value: string; range: DateRange }[] {
  const months: { value: string; range: DateRange }[] = [];
  for (let back = 5; back >= 0; back--) {
    const { year, month: m } = normalize(month.year, month.month - back);
    months.push({
      value: monthValue(year, m),
      range: { from: argentinaMonthStart(year, m), to: argentinaMonthStart(year, m + 1) },
    });
  }
  return months;
}
