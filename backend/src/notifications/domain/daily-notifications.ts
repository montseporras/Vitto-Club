import { toArgentinaDateString } from '../../shared/time/argentina-date.js';

// US-47 y US-48 (contrato S5 §3.8): reglas puras del proceso diario de avisos (09:00, hora de Argentina).

// Argentina no tiene horario de verano: es UTC-3 todo el año (el proyecto lo asume en todos lados)
const ARGENTINA_OFFSET = '-03:00';

export type ArgentinaDay = { year: number; month: number; day: number };

// El día de `now` en hora de Argentina
export function argentinaDayOf(now: Date): ArgentinaDay {
  const [year, month, day] = toArgentinaDateString(now).split('-').map(Number);
  return { year, month, day };
}

export const isLeapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

// Las fechas de nacimiento (mes y día) que cumplen años en ese día (§3.8.1). Quien nació un 29 de febrero cumple el 28
// de febrero en los años que no son bisiestos; en los bisiestos, el 29.
export function birthdayDatesFor(today: ArgentinaDay): { month: number; day: number }[] {
  const dates = [{ month: today.month, day: today.day }];
  if (today.month === 2 && today.day === 28 && !isLeapYear(today.year)) {
    dates.push({ month: 2, day: 29 });
  }
  return dates;
}

// El año calendario en hora de Argentina, como [from, to): para saber si ya se regaló este año (CA-48.5)
export function argentinaYearPeriod(year: number): { from: Date; to: Date } {
  return {
    from: new Date(`${year}-01-01T00:00:00.000${ARGENTINA_OFFSET}`),
    to: new Date(`${year + 1}-01-01T00:00:00.000${ARGENTINA_OFFSET}`),
  };
}

// El saludo cuando el regalo es de 0 puntos: un texto fijo, sin mencionar puntos (decisión de Montse, 12/11/2026). Ignora el
// mensaje que haya guardado el Administrador, que casi seguro habla de puntos. Sigue respetando el interruptor del tipo.
export const BIRTHDAY_GREETING_WITHOUT_GIFT = {
  subject: '¡Feliz cumpleaños!',
  body: '¡Feliz cumpleaños, {nombre}!',
} as const;

// Los valores de las variables van como texto, con el mismo formato que la pantalla: puntos con punto de miles (1.250)
// y fechas dd/mm/aaaa en hora de Argentina
export const formatPointsValue = (points: number): string => points.toLocaleString('es-AR');

export function formatArgentinaDate(date: Date): string {
  const [year, month, day] = toArgentinaDateString(date).split('-');
  return `${day}/${month}/${year}`;
}
