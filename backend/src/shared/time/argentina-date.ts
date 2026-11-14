// §3.4.1: nextExpirations.expiresAt va en YYYY-MM-DD, hora de Argentina (UTC-3, sin
// horario de verano). Las fechas llegan en UTC desde la base.
const ARGENTINA_OFFSET_HOURS = 3;

export function toArgentinaDateString(date: Date): string {
  const shifted = new Date(date.getTime() - ARGENTINA_OFFSET_HOURS * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Estadísticas (S5 §3.9): año, mes (1–12) y día de una fecha, en hora de Argentina
export function toArgentinaParts(date: Date): { year: number; month: number; day: number } {
  const shifted = new Date(date.getTime() - ARGENTINA_OFFSET_HOURS * 60 * 60 * 1000);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

// El instante (UTC) en que empieza el día 1 de un mes en Argentina: las 00:00 de ahí son las 03:00 UTC.
// Acepta meses fuera de 1–12 (0 = diciembre del año anterior, 13 = enero del siguiente).
export function argentinaMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1, ARGENTINA_OFFSET_HOURS));
}
