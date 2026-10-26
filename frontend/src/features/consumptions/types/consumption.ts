// Tipos de los consumos, iguales al contrato (§3.3 y §3.10.2). El consumo completo (§3.3.3) es
// el de features/cashier, que ya lo usa para registrar y anular.
import type { Consumption } from '@/features/cashier';

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

// Filtros de GET /consumos (§3.3.1). Solo viajan los que tienen valor.
export type ConsumptionFilters = {
  // 'YYYY-MM-DD', en hora de Argentina
  fromDate?: string;
  toDate?: string;
  q?: string;
  status?: ConsumptionStatus;
  registeredByAccountId?: number;
  // Lo usa "Ver todos" desde la ficha del cliente
  customerId?: number;
};

// Respuesta de GET /consumos (§3.3.1). `count` incluye los anulados; los montos, solo los
// REGISTERED.
export type ConsumptionsListResponse = {
  items: Consumption[];
  total: number;
  page: number;
  limit: number;
  totals: { count: number; amountTotal: number; pointsTotal: number };
};
