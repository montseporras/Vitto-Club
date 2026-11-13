import { DomainError as PointsDomainError } from '../../points/domain/errors/domain.error.js';
import { buildMovementDateRange, type MovementDateRange } from '../../points/domain/movement-filters.js';
import { DomainError } from './errors/domain.error.js';

// US-14 (contrato S5 §3.8.4): reglas puras de los filtros del historial de notificaciones. Son las mismas que
// las de GET /canjes (contrato S4 §3.12.3).

// "documentNumber": se normaliza igual que en clientes (sin puntos, espacios ni guiones, en mayúsculas) y es
// coincidencia parcial. Si queda vacío (por ejemplo "..."), se ignora el filtro en lugar de responder 400.
export function normalizeDocumentFilter(raw?: string): string | undefined {
  if (raw === undefined) return undefined;
  const normalized = raw.replace(/[\s.-]/g, '').toUpperCase();
  return normalized || undefined;
}

// fromDate y toDate inclusivos, por createdAt, en hora de Argentina. Mismas reglas y mensajes que Movimientos
// de puntos, Consumos y Canjes. El DomainError de points es otra clase: se pasa al de notifications para que
// el filtro del módulo responda 400.
export function buildNotificationDateRange(fromDate?: string, toDate?: string): MovementDateRange {
  try {
    return buildMovementDateRange(fromDate, toDate);
  } catch (error) {
    if (error instanceof PointsDomainError) {
      throw new DomainError(error.message, error.field);
    }
    throw error;
  }
}
