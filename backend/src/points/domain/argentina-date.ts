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
