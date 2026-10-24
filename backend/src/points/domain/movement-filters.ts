import { DomainError } from './errors/domain.error.js';

// Argentina es UTC-3 todo el año (sin horario de verano)
const ARGENTINA_OFFSET = '-03:00';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MIN_DOCUMENT_DIGITS = 3;

// Rango de createdAt en UTC: [createdFrom, createdBefore)
export type MovementDateRange = { createdFrom?: Date; createdBefore?: Date };

// Inicio del día `YYYY-MM-DD` en hora de Argentina, como instante UTC. Mismo criterio y mismos
// mensajes que los filtros de auditoría (decisión de Jazmín).
function startOfArgentinaDay(value: string, field: string): Date {
  const start = new Date(`${value}T00:00:00.000${ARGENTINA_OFFSET}`);
  // Una fecha inexistente (2026-13-45, 2026-02-30) no es válida: la medianoche de Argentina cae
  // a las 03:00 UTC del mismo día, así que el día UTC tiene que coincidir.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== value) {
    throw new DomainError(`${field} no es una fecha válida (YYYY-MM-DD)`, field);
  }
  return start;
}

// §3.6.2: fromDate y toDate inclusivos, en hora de Argentina. Rango invertido → 400 (§6).
export function buildMovementDateRange(fromDate?: string, toDate?: string): MovementDateRange {
  const from = fromDate !== undefined ? startOfArgentinaDay(fromDate, 'fromDate') : undefined;
  const to = toDate !== undefined ? startOfArgentinaDay(toDate, 'toDate') : undefined;
  if (from && to && from.getTime() > to.getTime()) {
    throw new DomainError('fromDate no puede ser posterior a toDate', 'fromDate');
  }
  return {
    ...(from ? { createdFrom: from } : {}),
    // toDate es inclusivo: el límite es el comienzo del día siguiente
    ...(to ? { createdBefore: new Date(to.getTime() + ONE_DAY_MS) } : {}),
  };
}

export type CustomerSearch =
  | { kind: 'document'; documentNumber: string }
  | { kind: 'name'; terms: string[] };

// Minúsculas y sin tildes (á→a, ü→u). La ñ se conserva: es otra letra
export function foldName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/ñ/g, 'ñ')
    .replace(/[̀-ͯ]/g, '');
}

// §3.3.1 (misma regla para q de movimientos, §3.6.2): con 3 dígitos o más busca en el número de
// documento (parcial); si no, en nombre y apellido sin distinguir mayúsculas ni tildes. Cada
// palabra tiene que aparecer en el nombre o en el apellido ("juan perez" encuentra a Juan Pérez).
export function parseCustomerSearch(q: string): CustomerSearch | undefined {
  const trimmed = q.trim();
  if (!trimmed) return undefined;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= MIN_DOCUMENT_DIGITS) {
    return { kind: 'document', documentNumber: trimmed.replace(/[\s.-]/g, '').toUpperCase() };
  }
  return { kind: 'name', terms: foldName(trimmed).split(/\s+/).filter(Boolean) };
}
