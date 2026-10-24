// Tipos del historial de consumos del Cliente, iguales al contrato (§3.3.3 y §3.10.2).
export type ConsumptionStatus = 'REGISTERED' | 'VOIDED';

// Consumo tal como lo devuelve GET /customers/me/consumos: sin registeredBy, voidedBy,
// canVoid ni voidableUntil (§3.10.2).
export type CustomerConsumption = {
  id: number;
  code: string;
  createdAt: string;
  amount: number;
  points: number;
  bonusPoints: number;
  totalPoints: number;
  equivalence: {
    baseAmount: number;
    pointsAwarded: number;
    configurationVersion: number;
  };
  notes: string | null;
  status: ConsumptionStatus;
  voidedAt: string | null;
  voidReason: string | null;
};

export type PaginatedConsumptions = {
  items: CustomerConsumption[];
  total: number;
  page: number;
  limit: number;
};
