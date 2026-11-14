// Las respuestas de las estadísticas, con la forma exacta del contrato S5 §3.9

// §3.9.1
export type CustomersStatistics = {
  active: number;
  new: number;
  frequent: number;
  frequentMinConsumptions: number;
  last6Months: { month: string; new: number; newFrequent: number }[];
};

// §3.9.2
export type ConsumptionsStatistics = {
  total: { count: number; amount: number };
  byWeekday: { weekday: number; count: number; amount: number }[];
  byTimeSlot: { from: string; to: string; count: number; amount: number }[];
};

// §3.9.3
export type PointsTotalsResponse = {
  awarded: number;
  bonus: number;
  missionRewards: number;
  birthdayBonus: number;
  redeemed: number;
  expired: number;
  voided: number;
};
export type PointsStatistics = PointsTotalsResponse & { previousMonth: PointsTotalsResponse };

// §3.9.4
export type ProgramStatistics = {
  levels: { level: 'BRONZE' | 'SILVER' | 'GOLD'; customers: number }[];
  levelUps: number;
  missions: { assigned: number; inProgress: number; completed: number; claimed: number; expired: number };
  topRewards: { id: number; name: string; used: number }[];
  redemptionsUsed: number;
};
