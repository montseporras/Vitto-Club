// Este archivo tiene las cuentas de fechas de la pantalla de estadísticas: el mes actual en
// hora de Argentina, las opciones de los selectores y los nombres de los meses.

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export interface YearMonth {
  year: number;
  /** 1 a 12 */
  month: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Mes y año de hoy en hora de Argentina (no en la de la computadora). */
export function currentArgentinaMonth(): YearMonth {
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const get = (type: 'year' | 'month') =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month') };
}

/** Día de hoy en hora de Argentina, 'dd/mm/aaaa' (el "Corte" del mes en curso). */
export function argentinaTodayLabel(): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

/** { 2026, 11 } → '2026-11' (lo que espera `month` en la API). */
export const toMonthParam = ({ year, month }: YearMonth) => `${year}-${pad(month)}`;

/** '2026-11' → { 2026, 11 } */
export function fromMonthParam(value: string): YearMonth {
  const [year, month] = value.split('-').map(Number);
  return { year, month };
}

/** '2026-11' → 'Noviembre 2026' */
export function monthLabel(value: string): string {
  const { year, month } = fromMonthParam(value);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** '2026-06' → 'Jun 26' (pastillas de la conversión de clientes nuevos). */
export function shortMonthLabel(value: string): string {
  const { year, month } = fromMonthParam(value);
  return `${MONTH_NAMES[month - 1].slice(0, 3)} ${String(year).slice(2)}`;
}

/** ¿El mes elegido es el actual? */
export const isCurrentMonth = (selected: YearMonth, today: YearMonth) =>
  selected.year === today.year && selected.month === today.month;

/** Años que ofrece el selector: el anterior y el actual (contrato §3.9). */
export const yearOptions = (today: YearMonth) => [today.year - 1, today.year];

/** Al cambiar de año, si el mes quedó en el futuro se baja al mes actual (como el prototipo). */
export function clampToToday(selected: YearMonth, today: YearMonth): YearMonth {
  return selected.year === today.year && selected.month > today.month
    ? { year: selected.year, month: today.month }
    : selected;
}
