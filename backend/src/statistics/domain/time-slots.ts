// S5 §3.9.2 (S5-22): cinco franjas horarias, en hora de Argentina: 00:00–08:00 y cuatro de 4 horas.
export const TIME_SLOTS = [
  { from: '00:00', to: '08:00' },
  { from: '08:00', to: '12:00' },
  { from: '12:00', to: '16:00' },
  { from: '16:00', to: '20:00' },
  { from: '20:00', to: '24:00' },
] as const;

// Índice de la franja de una hora (0–23)
export function timeSlotIndexOfHour(hour: number): number {
  return hour < 8 ? 0 : Math.floor((hour - 8) / 4) + 1;
}

// 1 = lunes … 7 = domingo
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
