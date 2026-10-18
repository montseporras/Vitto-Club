import { PointsLot } from '../points-lot.js';

// Fila de customer_points (balance/debt/lifetimePoints). No es una entidad de dominio
// propia: acá se modela como dato simple, la lógica de negocio vive en PointsService.
export type CustomerPointsBalance = {
  customerId: number;
  balance: number;
  debt: number;
  lifetimePoints: number;
};

export type InsertMovementData = {
  customerId: number;
  type: 'PURCHASE_CREDIT' | 'VOID_REVERSAL' | 'MANUAL_ADJUSTMENT';
  points: number;
  balanceAfter: number;
  consumptionId: number | null;
  lotId: number | null;
  reason?: string | null;
  performedByAccountId: number;
  performedByName: string;
};

// Configuración vigente que PointsService necesita leer (vigencia para el snapshot del
// lote, y umbrales de nivel). Se lee directo de loyalty_program_configurations por Prisma,
// sin pasar por el código de `loyalty` (ese módulo no es mío, pero la columna es pública).
export type ActiveLoyaltyConfiguration = {
  pointsExpirationMonths: number;
  silverMinPoints: number;
  goldMinPoints: number;
};

export abstract class PointsRepository {
  // CA-BASE.10: bloquea (o crea, Opción B de P6, si todavía no existe) la fila de
  // customer_points de ese cliente, antes de leer/escribir lotes y saldo.
  abstract lockOrCreateBalance(customerId: number): Promise<CustomerPointsBalance>;

  // Lectura sin lock, para resumen() (solo consulta). null si el cliente nunca tuvo
  // ningún movimiento todavía (Opción B: la fila no existe hasta el primero).
  abstract findBalance(customerId: number): Promise<CustomerPointsBalance | null>;

  abstract updateBalance(
    customerId: number,
    data: { balance: number; debt: number; lifetimePoints: number },
  ): Promise<void>;

  // Lotes ACTIVE de un cliente, ordenados por expiresAt ascendente (FIFO / próximos
  // vencimientos).
  abstract findActiveLotsByCustomerId(customerId: number): Promise<PointsLot[]>;

  // El lote que generó un consumo puntual (CA-BASE.4). null si ese consumo no generó lote
  // propio (p. ej. porque todo fue a cancelar deuda).
  abstract findLotByConsumptionId(consumptionId: number): Promise<PointsLot | null>;

  abstract createLot(lot: PointsLot): Promise<PointsLot>;
  abstract updateLot(lot: PointsLot): Promise<void>;

  abstract insertMovement(data: InsertMovementData): Promise<void>;

  // null si no hay ninguna configuración activa (no debería pasar en el flujo normal:
  // quien llama a acreditar/ajustar ya validó que existe antes de llegar acá).
  abstract findActiveLoyaltyConfiguration(): Promise<ActiveLoyaltyConfiguration | null>;
}
