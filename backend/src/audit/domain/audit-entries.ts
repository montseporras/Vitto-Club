import type { DocumentType } from '../../customers/domain/customer.js';
import type { AuditActor, AuditDetail, AuditEntryInput } from './audit-entry.js';

// Arma las entradas de auditoría de las acciones que ya existían (contrato §3.9.3). Son
// funciones puras sobre datos primitivos: el texto de `description` y las filas de `details`
// (en español, ya formateadas) se definen acá y en ningún otro lado.
// Nunca reciben ni guardan contraseñas ni hashes (CA-57.10).

const NONE = '—';
const NO_CHANGES = 'Se guardó sin modificar valores';

const ROLE_LABELS: Record<string, string> = { ADMIN: 'Administrador', CASHIER: 'Cajero' };
const BONUS_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: 'Porcentaje',
  FIXED_AMOUNT: 'Puntos fijos',
};

const roleLabel = (role: string): string => ROLE_LABELS[role] ?? role;
const orNone = (value: string | null | undefined): string => (value ? value : NONE);
const change = (before: string, after: string): string => `${before} → ${after}`;
const fullName = (person: { firstName: string; lastName: string }): string =>
  `${person.firstName} ${person.lastName}`;
const formatNumber = (value: number | null): string =>
  value === null ? NONE : value.toLocaleString('es-AR');

// dd/mm/aaaa. La fecha de nacimiento se guarda sin hora: se lee en UTC para no correrla un día.
function formatDate(date: Date | null): string {
  if (!date) return NONE;
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

type Field = { label: string; before: string; after: string };

// Una fila por campo que cambió: `{Campo}: {antes} → {después}`
const changedRows = (fields: Field[]): AuditDetail[] =>
  fields
    .filter((field) => field.before !== field.after)
    .map((field) => ({ label: field.label, value: change(field.before, field.after) }));

// --- Empleados ---------------------------------------------------------------------------

export type EmployeeSnapshot = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone: string | null;
};

export function employeeCreatedEntry(actor: AuditActor, employee: EmployeeSnapshot): AuditEntryInput {
  return {
    actor,
    module: 'EMPLOYEES',
    action: 'EMPLOYEE_CREATED',
    description: `Registró al empleado ${fullName(employee)}`,
    details: [
      { label: 'Mail', value: employee.email },
      { label: 'Rol', value: roleLabel(employee.role) },
    ],
  };
}

export function employeeUpdatedEntry(
  actor: AuditActor,
  before: EmployeeSnapshot,
  after: EmployeeSnapshot,
): AuditEntryInput {
  return {
    actor,
    module: 'EMPLOYEES',
    action: 'EMPLOYEE_UPDATED',
    description: `Editó al empleado ${fullName(after)}`,
    details: changedRows([
      { label: 'Nombre', before: before.firstName, after: after.firstName },
      { label: 'Apellido', before: before.lastName, after: after.lastName },
      { label: 'Teléfono', before: orNone(before.phone), after: orNone(after.phone) },
      { label: 'Rol', before: roleLabel(before.role), after: roleLabel(after.role) },
    ]),
  };
}

export function employeeDeactivatedEntry(actor: AuditActor, employee: EmployeeSnapshot): AuditEntryInput {
  return {
    actor,
    module: 'EMPLOYEES',
    action: 'EMPLOYEE_DEACTIVATED',
    description: `Dio de baja al empleado ${fullName(employee)}`,
    details: [{ label: 'Estado', value: change('Activo', 'Inactivo') }],
  };
}

// --- Cuentas de usuario ------------------------------------------------------------------

export function userAccountCreatedEntry(
  actor: AuditActor,
  employee: { firstName: string; lastName: string },
  email: string,
): AuditEntryInput {
  return {
    actor,
    module: 'EMPLOYEES',
    action: 'USER_ACCOUNT_CREATED',
    description: `Creó el usuario de ${fullName(employee)}`,
    details: [{ label: 'Usuario', value: email }],
  };
}

export function userAccountUpdatedEntry(
  actor: AuditActor,
  employee: { firstName: string; lastName: string },
  changes: { previousRole?: string; newRole?: string; passwordChanged: boolean },
): AuditEntryInput {
  const roleChanged = changes.previousRole !== undefined && changes.previousRole !== changes.newRole;
  const details: AuditDetail[] = [];
  if (roleChanged) {
    details.push({
      label: 'Rol',
      value: change(roleLabel(changes.previousRole as string), roleLabel(changes.newRole as string)),
    });
  }
  if (changes.passwordChanged) {
    details.push({ label: 'Contraseña', value: 'Modificada' });
  }

  const name = fullName(employee);
  const description =
    roleChanged && changes.passwordChanged
      ? `Editó el usuario de ${name}`
      : roleChanged
        ? `Cambió el rol de ${name}`
        : `Cambió la contraseña de ${name}`;

  return { actor, module: 'EMPLOYEES', action: 'USER_ACCOUNT_UPDATED', description, details };
}

export function userAccountDeactivatedEntry(
  actor: AuditActor,
  employee: { firstName: string; lastName: string },
): AuditEntryInput {
  return {
    actor,
    module: 'EMPLOYEES',
    action: 'USER_ACCOUNT_DEACTIVATED',
    description: `Dio de baja el usuario de ${fullName(employee)}`,
    details: [{ label: 'Estado del usuario', value: change('Activo', 'Inactivo') }],
  };
}

export function userAccountReactivatedEntry(
  actor: AuditActor,
  employee: { firstName: string; lastName: string },
): AuditEntryInput {
  return {
    actor,
    module: 'EMPLOYEES',
    action: 'USER_ACCOUNT_REACTIVATED',
    description: `Reactivó el usuario de ${fullName(employee)}`,
    details: [{ label: 'Estado del usuario', value: change('Inactivo', 'Activo') }],
  };
}

// --- Clientes ----------------------------------------------------------------------------

export type CustomerSnapshot = {
  id: number;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  phone: string | null;
  dateOfBirth: Date | null;
};

const affectedCustomerOf = (customer: CustomerSnapshot) => ({
  customerId: customer.id,
  name: fullName(customer),
  documentType: customer.documentType,
  documentNumber: customer.documentNumber,
});

export function customerCreatedEntry(
  actor: AuditActor,
  customer: CustomerSnapshot,
  origin: 'CASHIER' | 'ADMIN',
): AuditEntryInput {
  return {
    actor,
    module: 'CUSTOMERS',
    action: 'CUSTOMER_CREATED',
    description: `Registró al cliente ${fullName(customer)}`,
    affectedCustomer: affectedCustomerOf(customer),
    details: [
      { label: 'Mail', value: customer.email },
      { label: 'Teléfono', value: orNone(customer.phone) },
      { label: 'Origen', value: origin === 'CASHIER' ? 'Caja' : 'Administración' },
      {
        label: 'Cuenta de acceso',
        value: 'Creada, contraseña inicial = número de documento',
      },
    ],
  };
}

export function customerUpdatedEntry(
  actor: AuditActor,
  before: CustomerSnapshot,
  after: CustomerSnapshot,
  reason?: string,
): AuditEntryInput {
  const document = (customer: CustomerSnapshot) =>
    `${customer.documentType} ${customer.documentNumber}`;
  const changes = changedRows([
    { label: 'Nombre', before: before.firstName, after: after.firstName },
    { label: 'Apellido', before: before.lastName, after: after.lastName },
    { label: 'Documento', before: document(before), after: document(after) },
    { label: 'Correo electrónico', before: before.email, after: after.email },
    { label: 'Teléfono', before: orNone(before.phone), after: orNone(after.phone) },
    {
      label: 'Fecha de nacimiento',
      before: formatDate(before.dateOfBirth),
      after: formatDate(after.dateOfBirth),
    },
  ]);
  return {
    actor,
    module: 'CUSTOMERS',
    action: 'CUSTOMER_UPDATED',
    description: `Editó los datos del cliente ${fullName(after)}`,
    affectedCustomer: affectedCustomerOf(after),
    // "Motivo" va al final y solo si se mandó reason (contrato §3.9.3)
    details: reason ? [...changes, { label: 'Motivo', value: reason }] : changes,
  };
}

// Saldo perdido: el saldo del cliente al darlo de baja (puede ser 0 o negativo)
export function customerDeactivatedEntry(
  actor: AuditActor,
  customer: CustomerSnapshot,
  lostBalance: number,
): AuditEntryInput {
  return {
    actor,
    module: 'CUSTOMERS',
    action: 'CUSTOMER_DEACTIVATED',
    description: `Dio de baja al cliente ${fullName(customer)}`,
    affectedCustomer: affectedCustomerOf(customer),
    details: [
      { label: 'Estado', value: change('Activo', 'Inactivo') },
      { label: 'Saldo perdido', value: `${formatNumber(lostBalance)} pts` },
    ],
  };
}

// --- Configuración del programa de puntos -----------------------------------------------

export type LoyaltyConfigSnapshot = {
  baseAmount: number | null;
  pointsAwarded: number | null;
  pointsExpirationMonths: number;
  bonusType: string | null;
  bonusValue: number | null;
};

const bonusTypeLabel = (type: string | null): string =>
  type === null ? NONE : (BONUS_TYPE_LABELS[type] ?? type);

// Si la sección cambió van todas sus filas (antes → después); si no, la fila fija de "sin cambios".
function configurationRows(fields: Field[]): AuditDetail[] {
  const changed = fields.some((field) => field.before !== field.after);
  if (!changed) return [{ label: 'Cambios', value: NO_CHANGES }];
  return fields.map((field) => ({ label: field.label, value: change(field.before, field.after) }));
}

export function pointsEquivalenceChanged(before: LoyaltyConfigSnapshot, after: LoyaltyConfigSnapshot): boolean {
  return before.baseAmount !== after.baseAmount || before.pointsAwarded !== after.pointsAwarded;
}

export function pointsValidityChanged(before: LoyaltyConfigSnapshot, after: LoyaltyConfigSnapshot): boolean {
  return before.pointsExpirationMonths !== after.pointsExpirationMonths;
}

export function firstPurchaseBonusChanged(before: LoyaltyConfigSnapshot, after: LoyaltyConfigSnapshot): boolean {
  return before.bonusType !== after.bonusType || before.bonusValue !== after.bonusValue;
}

export function pointsEquivalenceUpdatedEntry(
  actor: AuditActor,
  before: LoyaltyConfigSnapshot,
  after: LoyaltyConfigSnapshot,
): AuditEntryInput {
  return {
    actor,
    module: 'CONFIGURATION',
    action: 'POINTS_EQUIVALENCE_UPDATED',
    description: 'Modificó la equivalencia de puntos',
    details: configurationRows([
      {
        label: 'Monto base ($)',
        before: formatNumber(before.baseAmount),
        after: formatNumber(after.baseAmount),
      },
      {
        label: 'Puntos por monto',
        before: formatNumber(before.pointsAwarded),
        after: formatNumber(after.pointsAwarded),
      },
    ]),
  };
}

export function pointsValidityUpdatedEntry(
  actor: AuditActor,
  before: LoyaltyConfigSnapshot,
  after: LoyaltyConfigSnapshot,
): AuditEntryInput {
  return {
    actor,
    module: 'CONFIGURATION',
    action: 'POINTS_VALIDITY_UPDATED',
    description: 'Modificó la vigencia de los puntos',
    details: configurationRows([
      {
        label: 'Vigencia (meses)',
        before: formatNumber(before.pointsExpirationMonths),
        after: formatNumber(after.pointsExpirationMonths),
      },
    ]),
  };
}

export function firstPurchaseBonusUpdatedEntry(
  actor: AuditActor,
  before: LoyaltyConfigSnapshot,
  after: LoyaltyConfigSnapshot,
): AuditEntryInput {
  return {
    actor,
    module: 'CONFIGURATION',
    action: 'FIRST_PURCHASE_BONUS_UPDATED',
    description: 'Modificó la bonificación por primera compra',
    details: configurationRows([
      {
        label: 'Tipo de bonificación',
        before: bonusTypeLabel(before.bonusType),
        after: bonusTypeLabel(after.bonusType),
      },
      {
        label: 'Valor de bonificación',
        before: formatNumber(before.bonusValue),
        after: formatNumber(after.bonusValue),
      },
    ]),
  };
}

// Guardado completo (PUT /loyalty/configuration): una entrada por cada sección que cambió. Si no
// cambió ninguna igual se registra una, con la fila "Cambios: Se guardó sin modificar valores"
// (contrato §3.9.3). Para ese caso el contrato no dice qué código usar: se usa el de la equivalencia.
export function configurationSavedEntries(
  actor: AuditActor,
  before: LoyaltyConfigSnapshot,
  after: LoyaltyConfigSnapshot,
): AuditEntryInput[] {
  const entries: AuditEntryInput[] = [];
  if (pointsEquivalenceChanged(before, after)) {
    entries.push(pointsEquivalenceUpdatedEntry(actor, before, after));
  }
  if (pointsValidityChanged(before, after)) {
    entries.push(pointsValidityUpdatedEntry(actor, before, after));
  }
  if (firstPurchaseBonusChanged(before, after)) {
    entries.push(firstPurchaseBonusUpdatedEntry(actor, before, after));
  }
  return entries.length > 0 ? entries : [pointsEquivalenceUpdatedEntry(actor, before, after)];
}
