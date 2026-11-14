import type { DateRange } from '../statistics-month.js';

export type MonthlyNewCustomers = { month: string; new: number; newFrequent: number };
export type ConsumptionTotals = { count: number; amount: number };
export type WeekdayRow = { weekday: number; count: number; amount: number };
export type TimeSlotRow = { slot: number; count: number; amount: number };
export type PointsTotals = {
  awarded: number;
  bonus: number;
  missionRewards: number;
  birthdayBonus: number;
  redeemed: number;
  expired: number;
  voided: number;
};
export type LevelThresholdsAt = { silverMinPoints: number; goldMinPoints: number };
export type LevelCount = { level: 'BRONZE' | 'SILVER' | 'GOLD'; customers: number };
export type MissionStatusCounts = { inProgress: number; completed: number; claimed: number; expired: number };
export type TopReward = { id: number; name: string; used: number };

// BASE-5 (contrato S5 §8.4): puerto de solo lectura. Lee las tablas por Prisma sin importar módulos de
// negocio. Todos los rangos son [from, to) en UTC, ya convertidos desde la hora de Argentina.
export abstract class StatisticsRepository {
  // US-51 — clientes
  // Mínimo de consumos de un cliente frecuente de la configuración vigente (S5-22)
  abstract getFrequentMinConsumptions(): Promise<number>;
  // No dados de baja al instante `cutoff`
  abstract countActiveCustomers(cutoff: Date): Promise<number>;
  abstract countNewCustomers(range: DateRange): Promise<number>;
  // Con al menos `minConsumptions` consumos REGISTERED dentro del rango
  abstract countFrequentCustomers(range: DateRange, minConsumptions: number): Promise<number>;
  // Por cada mes que tenga altas: clientes nuevos y los que llegaron al mínimo en ese mismo mes (S5-53)
  abstract newCustomersConversion(range: DateRange, minConsumptions: number): Promise<MonthlyNewCustomers[]>;

  // US-52 — consumos REGISTERED, en hora de Argentina
  abstract consumptionTotals(range: DateRange): Promise<ConsumptionTotals>;
  abstract consumptionsByWeekday(range: DateRange): Promise<WeekdayRow[]>;
  abstract consumptionsByTimeSlot(range: DateRange): Promise<TimeSlotRow[]>;

  // US-53 — movimientos de puntos del rango, por tipo y en valor absoluto
  abstract pointsTotals(range: DateRange): Promise<PointsTotals>;

  // US-54 — programa
  // Umbrales de nivel de la configuración vigente en `at`
  abstract findLevelThresholdsAt(at: Date): Promise<LevelThresholdsAt>;
  // Nivel actual de los clientes activos
  abstract countCustomersByLevel(thresholds: LevelThresholdsAt): Promise<LevelCount[]>;
  // Clientes activos en `end` cuyo nivel en `end` es más alto que el que tenían en `start`
  abstract countLevelUps(args: {
    start: Date;
    end: Date;
    thresholdsAtStart: LevelThresholdsAt;
    thresholdsAtEnd: LevelThresholdsAt;
  }): Promise<number>;
  // Asignaciones de misiones del mes (`period` = día 1, `YYYY-MM-01`), por estado
  abstract countMissionsByStatus(period: string): Promise<MissionStatusCounts>;
  abstract topRedeemedRewards(range: DateRange, limit: number): Promise<TopReward[]>;
  abstract countUsedRedemptions(range: DateRange): Promise<number>;
}
