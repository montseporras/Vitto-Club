import { toArgentinaDateString } from '../../shared/time/argentina-date.js';
import type { PointsLotStatus } from './points-lot.js';

export type { PointsLotStatus };

// §2.2 PointsMovementType y PointsLotStatus. REDEMPTION ya existe para el filtro (Sprint 4);
// MISSION_REWARD y BIRTHDAY_BONUS son del Sprint 5 (contrato S5 §2.7, BASE-5).
export const POINTS_MOVEMENT_TYPES = [
  'CONSUMPTION_CREDIT',
  'VOID_REVERSAL',
  'MANUAL_ADJUSTMENT',
  'EXPIRATION',
  'REDEMPTION',
  'MISSION_REWARD',
  'BIRTHDAY_BONUS',
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
  // Solo REDEMPTION: snapshot del nombre de la recompensa guardado en el canje
  redemption: { rewardName: string } | null;
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

// Lo único que necesita describeMovement: así también lo usa la respuesta del ajuste (US-24).
// `redemption` es opcional porque solo lo necesita REDEMPTION.
type DescribableMovement = Pick<PointsMovementRecord, 'id' | 'type' | 'consumptionId' | 'reason' | 'lot'> &
  Partial<Pick<PointsMovementRecord, 'redemption'>>;

function requireConsumptionId(record: DescribableMovement): number {
  if (record.consumptionId === null) {
    throw new Error(`Points movement ${record.id} of type ${record.type} has no consumption`);
  }
  return record.consumptionId;
}

// CA-26.2: "Detalle / origen" que arma el backend (§3.6). En el vencimiento, la fecha es la de
// acreditación del lote (decisión de Jazmín: "el lote que ganaste ese día").
export function describeMovement(record: DescribableMovement): string {
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
      // BASE-4 (CA-B4.6): el nombre es el snapshot guardado en el canje; se lee con un join, no se
      // guarda en el movimiento
      if (!record.redemption) {
        throw new Error(`Points movement ${record.id} of type REDEMPTION has no redemption`);
      }
      return `Canje: ${record.redemption.rewardName}`;
    case 'MISSION_REWARD':
      // Contrato S5 §2.7: "Recompensa de misión: {misión}". El nombre de la misión se lee con un join
      // que arma US-31 junto con el reclamo; BASE-5 solo agrega el tipo. Hasta entonces no hay filas.
      throw new Error(`Points movement ${record.id} of type MISSION_REWARD has no mission (US-31 completes it)`);
    case 'BIRTHDAY_BONUS':
      // Contrato S5 §2.7 (vista del personal). La del Cliente ("Te regalamos {n} pts por tu cumpleaños")
      // la arma US-48.
      return 'Regalo de cumpleaños';
  }
}

// Tipos que llevan lote según §3.6. VOID_REVERSAL guarda el lotId en la base, pero el contrato
// no lo expone (decisión de Jazmín: null). Un ajuste SUBTRACT ya no tiene lote.
const TYPES_WITH_LOT: readonly PointsMovementType[] = ['CONSUMPTION_CREDIT', 'MANUAL_ADJUSTMENT', 'EXPIRATION'];
const TYPES_WITH_CONSUMPTION: readonly PointsMovementType[] = ['CONSUMPTION_CREDIT', 'VOID_REVERSAL'];

// "Realizado por" (§3.6): el empleado guardado en el movimiento, o "Sistema" si no hay cuenta
export function toPerformedBy(
  record: Pick<PointsMovementRecord, 'performedByAccountId' | 'performedByName'>,
): PointsMovementView['performedBy'] {
  return record.performedByAccountId === null
    ? { actorType: 'SYSTEM', accountId: null, name: SYSTEM_NAME }
    : { actorType: 'EMPLOYEE', accountId: record.performedByAccountId, name: record.performedByName };
}

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
    performedBy: toPerformedBy(record),
  };
}
