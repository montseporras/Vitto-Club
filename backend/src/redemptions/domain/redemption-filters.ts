import { DomainError as PointsDomainError } from '../../points/domain/errors/domain.error.js';
import {
  buildMovementDateRange,
  foldName,
  type MovementDateRange,
} from '../../points/domain/movement-filters.js';
import { DomainError } from './errors/domain.error.js';
import type { RedemptionStatus } from './redemption.js';

// US-45 (contrato S4 §3.12): reglas puras de los filtros de los listados de canjes.

// §2.6: filtro "Estado" de Mis canjes. Sin valor = todos
export const REDEMPTION_STATUS_GROUPS = ['CONFIRMED', 'FINISHED'] as const;
export type RedemptionStatusGroup = (typeof REDEMPTION_STATUS_GROUPS)[number];

const STATUSES_BY_GROUP: Record<RedemptionStatusGroup, RedemptionStatus[]> = {
  CONFIRMED: ['CONFIRMED'],
  FINISHED: ['USED', 'CANCELLED', 'REJECTED', 'EXPIRED'],
};

// undefined = todos los estados
export function statusesOfGroup(group?: RedemptionStatusGroup): RedemptionStatus[] | undefined {
  return group ? STATUSES_BY_GROUP[group] : undefined;
}

// "Orden": Más recientes (desc, por defecto) · Más antiguos (asc), por createdAt
export const REDEMPTION_ORDERS = ['desc', 'asc'] as const;
export type RedemptionOrder = (typeof REDEMPTION_ORDERS)[number];

// §3.12.3 "code": se normaliza y es coincidencia parcial. No se usa normalizarCodigo (exige los 6
// caracteres): mayúsculas, sin espacios ni guiones, sin validar el alfabeto (un 0, O, 1 o I no
// encuentra nada). Vacío = sin filtro. Decisión de Melisa.
export function normalizeCodeFilter(raw?: string): string | undefined {
  if (raw === undefined) return undefined;
  const normalized = raw.replace(/[\s-]/g, '').toUpperCase();
  return normalized || undefined;
}

// §3.12.3 "documentNumber": se normaliza igual que en clientes (sin puntos, espacios ni guiones, en
// mayúsculas) y es coincidencia parcial. Si queda vacío (por ejemplo "..."), se ignora el filtro en
// lugar de responder 400 (decisión de Melisa).
export function normalizeDocumentFilter(raw?: string): string | undefined {
  if (raw === undefined) return undefined;
  const normalized = raw.replace(/[\s.-]/g, '').toUpperCase();
  return normalized || undefined;
}

// §3.12.3 "rewardName": parte del nombre (snapshot), sin distinguir mayúsculas ni tildes. Se pliega
// igual que los nombres de Movimientos de puntos (foldName). Vacío = sin filtro.
export function foldRewardNameFilter(raw?: string): string | undefined {
  if (raw === undefined) return undefined;
  const folded = foldName(raw.trim());
  return folded || undefined;
}

// fromDate y toDate inclusivos, por createdAt, en hora de Argentina (§3.12.1 y §3.12.3). Mismas
// reglas y mensajes que Movimientos de puntos y Consumos (decisión de Melisa). El DomainError de
// points es otra clase: se pasa al de redemptions para que el filtro del módulo responda 400.
export function buildRedemptionDateRange(fromDate?: string, toDate?: string): MovementDateRange {
  try {
    return buildMovementDateRange(fromDate, toDate);
  } catch (error) {
    if (error instanceof PointsDomainError) {
      throw new DomainError(error.message, error.field);
    }
    throw error;
  }
}

export type RedemptionDateRange = MovementDateRange;
