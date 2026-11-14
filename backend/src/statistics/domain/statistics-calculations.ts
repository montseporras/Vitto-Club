import { TIME_SLOTS, WEEKDAYS } from './time-slots.js';
import type {
  MissionStatusCounts,
  MonthlyNewCustomers,
  PointsTotals,
  TimeSlotRow,
  WeekdayRow,
} from './port/statistics.repository.js';

// Rellena los 6 meses de `last6Months` (aunque un mes no tenga altas) en el orden pedido
export function fillConversionMonths(months: string[], rows: MonthlyNewCustomers[]): MonthlyNewCustomers[] {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return months.map((month) => byMonth.get(month) ?? { month, new: 0, newFrequent: 0 });
}

// byWeekday trae los 7 días y byTimeSlot las 5 franjas, aunque alguna tenga 0 (S5 §3.9.2)
export function fillWeekdays(rows: WeekdayRow[]): WeekdayRow[] {
  const byDay = new Map(rows.map((row) => [row.weekday, row]));
  return WEEKDAYS.map((weekday) => byDay.get(weekday) ?? { weekday, count: 0, amount: 0 });
}

export function fillTimeSlots(rows: TimeSlotRow[]): { from: string; to: string; count: number; amount: number }[] {
  const bySlot = new Map(rows.map((row) => [row.slot, row]));
  return TIME_SLOTS.map((slot, index) => ({
    from: slot.from,
    to: slot.to,
    count: bySlot.get(index)?.count ?? 0,
    amount: bySlot.get(index)?.amount ?? 0,
  }));
}

// `assigned` = la suma de los cuatro estados (S5 §3.9.4)
export function missionTotals(counts: MissionStatusCounts) {
  return {
    assigned: counts.inProgress + counts.completed + counts.claimed + counts.expired,
    inProgress: counts.inProgress,
    completed: counts.completed,
    claimed: counts.claimed,
    expired: counts.expired,
  };
}

// Total acreditado en el mes: consumos + bonificación + misiones + cumpleaños (S5 §3.9.7)
export function totalAwarded(
  points: Pick<PointsTotals, 'awarded' | 'bonus' | 'missionRewards' | 'birthdayBonus'>,
): number {
  return points.awarded + points.bonus + points.missionRewards + points.birthdayBonus;
}

// Porcentaje con un decimal (cantidad ÷ total). Sin total → 0
export function percentage(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10;
}

// Variación contra el mes anterior, con un decimal: (mes − anterior) ÷ anterior. Si el anterior dio 0, null
// ("Sin datos de {mes}.")
export function variation(current: number, previous: number): number | null {
  return previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10;
}

// Tasa de efectividad: (Completadas + Reclamadas) ÷ asignadas, con un decimal
export function effectivenessRate(missions: { assigned: number; completed: number; claimed: number }): number {
  return percentage(missions.completed + missions.claimed, missions.assigned);
}

export const round2 = (value: number): number => Math.round(value * 100) / 100;
