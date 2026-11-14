// Este archivo tiene los nombres y la cuenta del "más fuerte" de la pestaña Consumos
// (contrato S5 §3.9.2 y §3.9.7). Los textos son los del prototipo.

// weekday: 1 = lunes … 7 = domingo (§3.9.2).
const WEEKDAY_NAMES: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

export const weekdayName = (weekday: number) => WEEKDAY_NAMES[weekday] ?? String(weekday);

/** 'Miércoles' → 'Mié' (el eje de la columna: Lun … Dom). */
export const weekdayShortName = (weekday: number) => weekdayName(weekday).slice(0, 3);

/** { from: '08:00', to: '12:00' } → '08:00–12:00' (con guion largo, como el prototipo). */
export const timeSlotLabel = (from: string, to: string) => `${from}–${to}`;

/**
 * Posición de la columna más fuerte (la de mayor cantidad). Si hay un empate, la primera.
 * Si no hubo ningún consumo, devuelve -1: no se resalta ninguna columna.
 */
export function strongestIndex(counts: number[]): number {
  let best = -1;
  let max = 0;
  counts.forEach((count, index) => {
    if (count > max) {
      max = count;
      best = index;
    }
  });
  return best;
}
