import type { DocumentType } from '../../customers/domain/customer.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { InvalidAuditEntryError } from './errors/invalid-audit-entry.error.js';

// Módulos y acciones del contrato (§3.9.2). El código se guarda siempre; el texto de cada acción
// lo traduce el frontend para el filtro y la fila muestra `description`.
export const AUDIT_ACTIONS_BY_MODULE = {
  EMPLOYEES: [
    'EMPLOYEE_CREATED',
    'EMPLOYEE_UPDATED',
    'EMPLOYEE_DEACTIVATED',
    'USER_ACCOUNT_CREATED',
    'USER_ACCOUNT_UPDATED',
    'USER_ACCOUNT_DEACTIVATED',
    'USER_ACCOUNT_REACTIVATED',
  ],
  CUSTOMERS: ['CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'CUSTOMER_DEACTIVATED'],
  CONSUMPTIONS: ['CONSUMPTION_REGISTERED', 'CONSUMPTION_VOIDED'],
  POINTS: ['POINTS_ADJUSTED', 'POINTS_EXPIRED'],
  REDEMPTIONS: [
    'REDEMPTION_CONFIRMED',
    'REDEMPTION_USED',
    'REDEMPTION_REJECTED',
    'REDEMPTION_EXPIRED',
  ],
  REWARDS: [
    'REWARD_CREATED',
    'REWARD_UPDATED',
    'REWARD_ACTIVATED',
    'REWARD_DEACTIVATED',
    'REWARD_DELETED',
    'REWARD_DISABLED',
    'REWARD_ENABLED',
  ],
  MISSIONS: [
    'MISSION_CREATED',
    'MISSION_UPDATED',
    'MISSION_DELETED',
    'MISSION_COMPLETED',
    'MISSION_REWARD_CLAIMED',
    'MISSIONS_EXPIRED',
  ],
  CONFIGURATION: [
    'POINTS_EQUIVALENCE_UPDATED',
    'POINTS_VALIDITY_UPDATED',
    'FIRST_CONSUMPTION_BONUS_UPDATED',
    'LEVELS_UPDATED',
    'LOGO_AND_MESSAGES_UPDATED',
    'PROMOTIONS_UPDATED',
  ],
} as const;

export type AuditModule = keyof typeof AUDIT_ACTIONS_BY_MODULE;
export type AuditAction = (typeof AUDIT_ACTIONS_BY_MODULE)[AuditModule][number];

// Quién hizo la operación: siempre un empleado o el Sistema, nunca un cliente (§3.9.1, regla 3).
export type AuditActor = { type: 'EMPLOYEE'; accountId: number } | { type: 'SYSTEM' };

// Fila del bloque "Detalle": ya formateada en español, se muestra tal cual.
export type AuditDetail = { label: string; value: string };

// Bloque "Cliente afectado": foto del momento, sin FK.
export type AuditAffectedCustomer = {
  customerId: number;
  name: string;
  documentType: DocumentType;
  documentNumber: string;
};

export type AuditEntryInput = {
  actor: AuditActor;
  module: AuditModule;
  action: AuditAction;
  description: string;
  affectedCustomer?: AuditAffectedCustomer;
  operationCode?: string;
  details: AuditDetail[];
};

const MAX_DESCRIPTION = 300;
const MAX_OPERATION_CODE = 20;
const MAX_CUSTOMER_NAME = 161;

// El actor de una operación hecha por un usuario autenticado. Un cliente nunca figura (CA-57.4).
export function actorOf(user: CurrentUserData): AuditActor {
  if (user.role === 'CUSTOMER') {
    throw new InvalidAuditEntryError('a customer cannot be the actor');
  }
  return { type: 'EMPLOYEE', accountId: user.accountId };
}

export const SYSTEM_ACTOR: AuditActor = { type: 'SYSTEM' };

// Una entrada sin módulo, acción, descripción o actor no se guarda (CA-57.9).
export function assertValidAuditEntry(entry: AuditEntryInput): void {
  const { actor, module, action, description, details, affectedCustomer, operationCode } = entry;

  if (!actor || (actor.type !== 'SYSTEM' && actor.type !== 'EMPLOYEE')) {
    throw new InvalidAuditEntryError('actor is required');
  }
  if (actor.type === 'EMPLOYEE' && !Number.isInteger(actor.accountId)) {
    throw new InvalidAuditEntryError('employee actor needs an accountId');
  }
  if (!module || !(module in AUDIT_ACTIONS_BY_MODULE)) {
    throw new InvalidAuditEntryError('module is required');
  }
  if (!action) {
    throw new InvalidAuditEntryError('action is required');
  }
  if (!(AUDIT_ACTIONS_BY_MODULE[module] as readonly string[]).includes(action)) {
    throw new InvalidAuditEntryError(`action ${action} does not belong to module ${module}`);
  }
  if (!description || description.trim() === '' || description.length > MAX_DESCRIPTION) {
    throw new InvalidAuditEntryError(`description is required (max ${MAX_DESCRIPTION} characters)`);
  }
  if (!Array.isArray(details)) {
    throw new InvalidAuditEntryError('details must be an array');
  }
  for (const detail of details) {
    if (typeof detail?.label !== 'string' || typeof detail?.value !== 'string') {
      throw new InvalidAuditEntryError('every detail needs a label and a value');
    }
  }
  if (operationCode !== undefined && operationCode.length > MAX_OPERATION_CODE) {
    throw new InvalidAuditEntryError(`operationCode is too long (max ${MAX_OPERATION_CODE})`);
  }
  if (affectedCustomer && affectedCustomer.name.length > MAX_CUSTOMER_NAME) {
    throw new InvalidAuditEntryError(`customer name is too long (max ${MAX_CUSTOMER_NAME})`);
  }
}
