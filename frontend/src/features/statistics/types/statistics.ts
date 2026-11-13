// Este archivo define la forma de las respuestas de las estadísticas, igual que el contrato
// del Sprint 5 (§3.9.1 a §3.9.4). Las cuatro se piden con el mismo filtro `month` (YYYY-MM).

// Mes que se consulta: 'YYYY-MM', en hora de Argentina.
export type MonthParam = string;

// §3.9.1 GET /estadisticas/clientes (US-51)
export interface ClientsLastMonth {
  month: string; // 'YYYY-MM'
  new: number;
  newFrequent: number;
}

export interface ClientsStatistics {
  active: number;
  new: number;
  frequent: number;
  frequentMinConsumptions: number;
  last6Months: ClientsLastMonth[];
}

// §3.9.2 GET /estadisticas/consumos (US-52)
export interface ConsumptionsStatistics {
  total: { count: number; amount: number };
  byWeekday: { weekday: number; count: number; amount: number }[]; // 1 = lunes … 7 = domingo
  byTimeSlot: { from: string; to: string; count: number; amount: number }[];
}

// §3.9.3 GET /estadisticas/puntos (US-53)
export interface PointsTotals {
  awarded: number;
  bonus: number;
  missionRewards: number;
  birthdayBonus: number;
  redeemed: number;
  expired: number;
  voided: number;
}

export interface PointsStatistics extends PointsTotals {
  previousMonth: PointsTotals;
}

// §3.9.4 GET /estadisticas/programa (US-54)
export type StatisticsLevel = 'BRONZE' | 'SILVER' | 'GOLD';

export interface ProgramStatistics {
  levels: { level: StatisticsLevel; customers: number }[];
  levelUps: number;
  missions: {
    assigned: number;
    inProgress: number;
    completed: number;
    claimed: number;
    expired: number;
  };
  topRewards: { id: number; name: string; used: number }[];
  redemptionsUsed: number;
}
