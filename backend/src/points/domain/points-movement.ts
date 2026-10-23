import { toArgentinaDateString } from './argentina-date.js';
import type { PointsLotStatus } from './points-lot.js';

export type { PointsLotStatus };

// §2.2 PointsMovementType y PointsLotStatus. REDEMPTION ya existe para el filtro (Sprint 4).
export const POINTS_MOVEMENT_TYPES = [
  'CONSUMPTION_CREDIT',
  'VOID_REVERSAL',
  'MANUAL_ADJUSTMENT',
  'EXPIRATION',
  'REDEMPTION',
] as const;
export type PointsMovementType = (typeof POINTS_MOVEMENT_TYPES)[number];


// Un movimiento tal como sale de la base, antes de armar lo que ve cada rol
export type PointsMovementRecord = {
  id: number;
  createdAt: Date;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
  };
  type: PointsMovementType;
  points: number;
  balanceAfter: number;
  consumptionId: number | null;
  reason: string | null;
  lot: { id: number; accreditedAt: Date; expiresAt: Date; status: PointsLotStatus } | null;
  // null = Sistema (procesos automáticos)
  performedByAccountId: number | null;
  performedByName: string;
};

// Tipo PointsMovement de §3.6, con las fechas todavía como Date
export type PointsMovementView = {
  id: number;
  createdAt: Date;
  customer: PointsMovementRecord['customer'];
  type: PointsMovementType;
  points: number;
  balanceAfter: number;
  description: string;
  consumptionCode: string | null;
  reason: string | null;
  // expiresAt en YYYY-MM-DD, hora de Argentina (decisión de Jazmín: igual que nextExpirations)
  lot: { id: number; accreditedAt: Date; expiresAt: string; status: PointsLotStatus } | null;
  performedBy: { actorType: 'EMPLOYEE' | 'SYSTEM'; accountId: number | null; name: string };
};

const CODE_PREFIX = 'C-';
const CODE_DIGITS = 6;
const SYSTEM_NAME = 'Sistema';

// §3.3.3: "C-" + id con ceros a la izquierda hasta 6 dígitos. Copia de la regla de
// consumptions/domain/consumption.ts: points no puede importar consumptions (§8.4).
export function formatConsumptionCode(consumptionId: number): string {
  return `${CODE_PREFIX}${String(consumptionId).padStart(CODE_DIGITS, '0')}`;
}

// dd/mm/aaaa en hora de Argentina
function toArgentinaDisplayDate(date: Date): string {
  const [year, month, day] = toArgentinaDateString(date).split('-');
  return `${day}/${month}/${year}`;
}

function requireConsumptionId(record: PointsMovementRecord): number {
  if (record.consumptionId === null) {
    throw new Error(`Points movement ${record.id} of type ${record.type} has no consumption`);
  }
  return record.consumptionId;
}

// CA-26.2: "Detalle / origen" que arma el backend (§3.6). En el vencimiento, la fecha es la de
// acreditación del lote (decisión de Jazmín: "el lote que ganaste ese día").
export function describeMovement(record: PointsMovementRecord): string {
  switch (record.type) {
    case 'CONSUMPTION_CREDIT':
      return `Consumo ${formatConsumptionCode(requireConsumptionId(record))}`;
    case 'VOID_REVERSAL':
      return `Anulación de ${formatConsumptionCode(requireConsumptionId(record))}`;
    case 'MANUAL_ADJUSTMENT':
      return `Ajuste: ${record.reason ?? ''}`;
    case 'EXPIRATION':
      if (!record.lot) {
        throw new Error(`Points movement ${record.id} of type EXPIRATION has no lot`);
      }
      return `Vencimiento de lote del ${toArgentinaDisplayDate(record.lot.accreditedAt)}`;
    case 'REDEMPTION':
      // "Canje: {recompensa}" necesita las recompensas del Sprint 4: hoy no puede existir
      throw new Error(`Points movement ${record.id}: REDEMPTION is not available until Sprint 4`);
  }
}

// Tipos que llevan lote según §3.6. VOID_REVERSAL guarda el lotId en la base, pero el contrato
// no lo expone (decisión de Jazmín: null). Un ajuste SUBTRACT ya no tiene lote.
const TYPES_WITH_LOT: readonly PointsMovementType[] = ['CONSUMPTION_CREDIT', 'MANUAL_ADJUSTMENT', 'EXPIRATION'];
const TYPES_WITH_CONSUMPTION: readonly PointsMovementType[] = ['CONSUMPTION_CREDIT', 'VOID_REVERSAL'];

export function toMovementView(record: PointsMovementRecord): PointsMovementView {
  const lot = TYPES_WITH_LOT.includes(record.type) && record.lot ? record.lot : null;
  return {
    id: record.id,
    createdAt: record.createdAt,
    customer: record.customer,
    type: record.type,
    points: record.points,
    balanceAfter: record.balanceAfter,
    description: describeMovement(record),
    consumptionCode:
      TYPES_WITH_CONSUMPTION.includes(record.type) && record.consumptionId !== null
        ? formatConsumptionCode(record.consumptionId)
        : null,
    reason: record.type === 'MANUAL_ADJUSTMENT' ? record.reason : null,
    lot: lot
      ? {
          id: lot.id,
          accreditedAt: lot.accreditedAt,
          expiresAt: toArgentinaDateString(lot.expiresAt),
          status: lot.status,
        }
      : null,
    performedBy:
      record.performedByAccountId === null
        ? { actorType: 'SYSTEM', accountId: null, name: SYSTEM_NAME }
        : { actorType: 'EMPLOYEE', accountId: record.performedByAccountId, name: record.performedByName },
  };
}
