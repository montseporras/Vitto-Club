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
  type: 'CONSUMPTION_CREDIT' | 'VOID_REVERSAL' | 'MANUAL_ADJUSTMENT' | 'EXPIRATION';
  points: number;
  balanceAfter: number;
  consumptionId: number | null;
  lotId: number | null;
  reason?: string | null;
  // null = Sistema (procesos automáticos, como el vencimiento de US-25)
  performedByAccountId: number | null;
  performedByName: string;
};

// US-25: lote candidato a vencer (ACTIVE, vencido, con saldo, de un cliente activo)
export type ExpiredLotCandidate = { lotId: number; customerId: number };

// US-25: datos del cliente para la auditoría POINTS_EXPIRED ("Cliente afectado", §3.9.3)
export type ExpirationCustomer = {
  id: number;
  firstName: string;
  lastName: string;
  documentType: 'DNI' | 'PASSPORT';
  documentNumber: string;
};

// Lo que la base le asigna al movimiento al guardarlo (US-24 lo devuelve en la respuesta)
export type InsertedMovement = { id: number; createdAt: Date };

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

  abstract insertMovement(data: InsertMovementData): Promise<InsertedMovement>;

  // null si no hay ninguna configuración activa (no debería pasar en el flujo normal:
  // quien llama a acreditar/ajustar ya validó que existe antes de llegar acá).
  abstract findActiveLoyaltyConfiguration(): Promise<ActiveLoyaltyConfiguration | null>;

  // US-25 (§3.6.3): lotes ACTIVE con expiresAt <= now y remaining > 0, ordenados por
  // vencimiento. Los clientes dados de baja se excluyen (decisión de Melisa).
  abstract findExpiredLotCandidates(now: Date): Promise<ExpiredLotCandidate[]>;

  // US-25: bloquea el lote con FOR UPDATE SKIP LOCKED. null si otra transacción lo tiene
  // bloqueado (otra instancia del proceso lo está venciendo) o si ya no existe (CA-25.4).
  abstract lockLotForExpiration(lotId: number): Promise<PointsLot | null>;

  // US-25: nombre y documento del cliente, leídos de customers por Prisma (decisión de
  // Melisa: points no importa el módulo customers, igual que con la configuración).
  abstract findExpirationCustomer(customerId: number): Promise<ExpirationCustomer>;
}
