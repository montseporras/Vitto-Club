import { normalizeDocumentNumber } from '../../customers/domain/customer.js';
import type { DocumentType } from '../../customers/domain/customer.js';
import { AUDIT_ACTIONS_BY_MODULE, type AuditAction, type AuditModule } from './audit-entry.js';
import { InvalidAuditFilterError } from './errors/invalid-audit-filter.error.js';

// Filtros de GET /auditoria (contrato §3.9.4), ya validados y listos para la consulta.
export type AuditActorFilter = { type: 'SYSTEM' } | { type: 'EMPLOYEE'; accountId: number };

export type AuditFilters = {
  actor?: AuditActorFilter;
  module?: AuditModule;
  action?: AuditAction;
  documentType?: DocumentType;
  // Normalizado; la búsqueda es por coincidencia parcial
  documentNumber?: string;
  // Rango de createdAt en UTC: [createdFrom, createdBefore)
  createdFrom?: Date;
  createdBefore?: Date;
  operationCode?: string;
  page: number;
  limit: number;
};

// Lo que llega de la query string, sin validar más que el formato básico del DTO
export type AuditFilterInput = {
  actor?: string;
  module?: AuditModule;
  action?: AuditAction;
  documentType?: DocumentType;
  documentNumber?: string;
  fromDate?: string;
  toDate?: string;
  date?: string;
  operationCode?: string;
  page: number;
  limit: number;
};

export type AuditActorOption = {
  accountId: number;
  name: string;
  role: 'ADMIN' | 'CASHIER';
  active: boolean;
};

// Argentina es UTC-3 todo el año (sin horario de verano)
const ARGENTINA_OFFSET = '-03:00';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Inicio del día `YYYY-MM-DD` en hora de Argentina, como instante UTC
function startOfArgentinaDay(value: string, field: string): Date {
  const start = new Date(`${value}T00:00:00.000${ARGENTINA_OFFSET}`);
  // Una fecha inexistente (2026-13-45, 2026-02-30) no es una fecha válida. La medianoche de
  // Argentina cae a las 03:00 UTC del mismo día, así que el día UTC tiene que coincidir.
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== value) {
    throw new InvalidAuditFilterError(`${field} no es una fecha válida (YYYY-MM-DD)`, field);
  }
  return start;
}

function parseActor(value: string): AuditActorFilter {
  if (value === 'SYSTEM') return { type: 'SYSTEM' };
  if (/^\d+$/.test(value)) {
    const accountId = Number(value);
    if (Number.isSafeInteger(accountId)) return { type: 'EMPLOYEE', accountId };
  }
  throw new InvalidAuditFilterError('actor debe ser SYSTEM o el id de una cuenta de empleado', 'actor');
}

// Reglas del contrato: `action` requiere `module` y debe pertenecerle; `date` no se combina con el
// rango; el rango no puede estar invertido; el documento se normaliza igual que en clientes.
export function buildAuditFilters(input: AuditFilterInput): AuditFilters {
  const filters: AuditFilters = { page: input.page, limit: input.limit };

  if (input.actor !== undefined) filters.actor = parseActor(input.actor);

  if (input.action !== undefined) {
    if (input.module === undefined) {
      throw new InvalidAuditFilterError('action requiere indicar el módulo', 'action');
    }
    if (!(AUDIT_ACTIONS_BY_MODULE[input.module] as readonly string[]).includes(input.action)) {
      throw new InvalidAuditFilterError('action no pertenece al módulo indicado', 'action');
    }
    filters.action = input.action;
  }
  if (input.module !== undefined) filters.module = input.module;

  if (input.documentNumber !== undefined) {
    let normalized: string;
    try {
      normalized = normalizeDocumentNumber(input.documentNumber);
    } catch {
      throw new InvalidAuditFilterError('documentNumber no es válido', 'documentNumber');
    }
    filters.documentNumber = normalized;
    // Por defecto DNI cuando viene el número (§3.9.4)
    filters.documentType = input.documentType ?? 'DNI';
  } else if (input.documentType !== undefined) {
    filters.documentType = input.documentType;
  }

  if (input.date !== undefined && (input.fromDate !== undefined || input.toDate !== undefined)) {
    throw new InvalidAuditFilterError('date no se puede combinar con fromDate ni toDate', 'date');
  }
  if (input.date !== undefined) {
    const start = startOfArgentinaDay(input.date, 'date');
    filters.createdFrom = start;
    filters.createdBefore = new Date(start.getTime() + ONE_DAY_MS);
  } else {
    const from = input.fromDate !== undefined ? startOfArgentinaDay(input.fromDate, 'fromDate') : undefined;
    const to = input.toDate !== undefined ? startOfArgentinaDay(input.toDate, 'toDate') : undefined;
    if (from && to && from.getTime() > to.getTime()) {
      throw new InvalidAuditFilterError('fromDate no puede ser posterior a toDate', 'fromDate');
    }
    // toDate es inclusivo: el límite es el comienzo del día siguiente
    if (from) filters.createdFrom = from;
    if (to) filters.createdBefore = new Date(to.getTime() + ONE_DAY_MS);
  }

  if (input.operationCode !== undefined) filters.operationCode = input.operationCode;

  return filters;
}
