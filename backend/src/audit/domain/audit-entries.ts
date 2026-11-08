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

// Lo mínimo para el bloque "Cliente afectado" (el vencimiento de US-25 no tiene más datos)
export type AffectedCustomerSnapshot = Pick<
  CustomerSnapshot,
  'id' | 'firstName' | 'lastName' | 'documentType' | 'documentNumber'
>;

const affectedCustomerOf = (customer: AffectedCustomerSnapshot) => ({
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

// Saldo perdido: el saldo del cliente al darlo de baja (puede ser 0 o negativo).
// US-43 (contrato S4 §3.13.1): si la baja rechazó canjes Confirmados, suma la fila
// "Canjes rechazados: {n}", solo si n > 0, después de "Saldo perdido" (decisión de Melisa).
export function customerDeactivatedEntry(
  actor: AuditActor,
  customer: CustomerSnapshot,
  lostBalance: number,
  rejectedRedemptions = 0,
): AuditEntryInput {
  const details: AuditDetail[] = [
    { label: 'Estado', value: change('Activo', 'Inactivo') },
    { label: 'Saldo perdido', value: `${formatNumber(lostBalance)} pts` },
  ];
  if (rejectedRedemptions > 0) {
    details.push({ label: 'Canjes rechazados', value: formatNumber(rejectedRedemptions) });
  }
  return {
    actor,
    module: 'CUSTOMERS',
    action: 'CUSTOMER_DEACTIVATED',
    description: `Dio de baja al cliente ${fullName(customer)}`,
    affectedCustomer: affectedCustomerOf(customer),
    details,
  };
}

// --- Puntos ------------------------------------------------------------------------------

// Cantidad con signo, como en el ejemplo de §3.9.4 ("−500 pts", con el signo menos U+2212).
// El saldo resultante va con formatNumber, que usa el guion común ("-350 pts"), igual que ese
// ejemplo (decisión de Jazmín).
const formatSignedPoints = (points: number): string =>
  `${points < 0 ? '−' : '+'}${formatNumber(Math.abs(points))} pts`;

export type PointsAdjustmentSnapshot = {
  // Con signo: + al sumar, − al restar
  points: number;
  balanceAfter: number;
  reason: string;
};

export function pointsAdjustedEntry(
  actor: AuditActor,
  customer: CustomerSnapshot,
  adjustment: PointsAdjustmentSnapshot,
): AuditEntryInput {
  return {
    actor,
    module: 'POINTS',
    action: 'POINTS_ADJUSTED',
    description: `Ajustó puntos de ${fullName(customer)}`,
    affectedCustomer: affectedCustomerOf(customer),
    details: [
      { label: 'Cantidad', value: formatSignedPoints(adjustment.points) },
      { label: 'Saldo resultante', value: `${formatNumber(adjustment.balanceAfter)} pts` },
      { label: 'Motivo', value: adjustment.reason },
    ],
  };
}

// US-25: fecha en hora de Argentina (UTC−03:00, sin horario de verano), dd/mm/aaaa. La fecha
// de acreditación es un instante (con hora), a diferencia de la fecha de nacimiento.
const ARGENTINA_OFFSET_MS = 3 * 60 * 60 * 1000;
const formatArgentinaDate = (date: Date): string =>
  formatDate(new Date(date.getTime() - ARGENTINA_OFFSET_MS));

export type PointsExpirationSnapshot = {
  // Puntos que vencieron (positivo)
  points: number;
  accreditedAt: Date;
  balanceAfter: number;
};

// POINTS_EXPIRED (§3.9.2 y §3.9.3): lo registra el Sistema, sin código de operación.
export function pointsExpiredEntry(
  customer: AffectedCustomerSnapshot,
  expiration: PointsExpirationSnapshot,
): AuditEntryInput {
  return {
    actor: { type: 'SYSTEM' },
    module: 'POINTS',
    action: 'POINTS_EXPIRED',
    description: `Venció ${formatNumber(expiration.points)} pts de ${fullName(customer)}`,
    affectedCustomer: affectedCustomerOf(customer),
    details: [
      { label: 'Puntos vencidos', value: formatSignedPoints(-expiration.points) },
      { label: 'Fecha del lote (acreditación)', value: formatArgentinaDate(expiration.accreditedAt) },
      { label: 'Saldo resultante', value: `${formatNumber(expiration.balanceAfter)} pts` },
    ],
  };
}

// --- Recompensas --------------------------------------------------------------------------

// §2.2: motivo de una recompensa deshabilitada, como se lee en auditoría
export type RewardDisabledReasonSnapshot = 'OUT_OF_STOCK' | 'EXPIRED';

const REWARD_DISABLED_REASON_TEXT: Record<RewardDisabledReasonSnapshot, string> = {
  OUT_OF_STOCK: 'Sin stock',
  EXPIRED: 'Vencida',
};

// §3.14.2 REWARD_ENABLED: por qué volvió a estar disponible, según el motivo que tenía
const REWARD_ENABLED_REASON_TEXT: Record<RewardDisabledReasonSnapshot, string> = {
  OUT_OF_STOCK: 'Stock repuesto',
  EXPIRED: 'Fecha de vencimiento actualizada',
};

// REWARD_DISABLED (contrato S4 §3.4 y §3.14.2, US-37): lo registra el Sistema, sin cliente ni
// código de operación. Detalle: Motivo (Sin stock / Vencida).
export function rewardDisabledEntry(
  rewardName: string,
  reason: RewardDisabledReasonSnapshot,
): AuditEntryInput {
  return {
    actor: { type: 'SYSTEM' },
    module: 'REWARDS',
    action: 'REWARD_DISABLED',
    description: `Deshabilitó la recompensa "${rewardName}"`,
    details: [{ label: 'Motivo', value: REWARD_DISABLED_REASON_TEXT[reason] }],
  };
}

// REWARD_ENABLED (contrato S4 §3.4 y §3.14.2, US-37): lo registra el Sistema. Detalle: Motivo
// (Stock repuesto / Fecha de vencimiento actualizada), según por qué estaba deshabilitada.
export function rewardEnabledEntry(
  rewardName: string,
  previousReason: RewardDisabledReasonSnapshot,
): AuditEntryInput {
  return {
    actor: { type: 'SYSTEM' },
    module: 'REWARDS',
    action: 'REWARD_ENABLED',
    description: `Habilitó la recompensa "${rewardName}"`,
    details: [{ label: 'Motivo', value: REWARD_ENABLED_REASON_TEXT[previousReason] }],
  };
}

export type RewardSnapshot = {
  name: string;
  points: number;
  // null = sin límite
  stock: number | null;
  // YYYY-MM-DD; null = no vence
  expiresAt: string | null;
};

// YYYY-MM-DD → dd/mm/aaaa, sin pasar por Date (es un día, no un instante)
const formatDateOnly = (value: string): string => value.split('-').reverse().join('/');

// REWARD_CREATED (contrato S4 §3.14.2, US-34). Sin cliente afectado ni código de operación.
// Formato de los valores (decisión de Jazmín): "150 pts", como REDEMPTION_CONFIRMED; el stock con
// punto de miles; la fecha en dd/mm/aaaa, como en la pantalla.
export function rewardCreatedEntry(actor: AuditActor, reward: RewardSnapshot): AuditEntryInput {
  return {
    actor,
    module: 'REWARDS',
    action: 'REWARD_CREATED',
    description: `Creó la recompensa "${reward.name}"`,
    details: [
      { label: 'Puntos', value: `${formatNumber(reward.points)} pts` },
      { label: 'Stock', value: reward.stock === null ? 'Sin límite' : formatNumber(reward.stock) },
      { label: 'Vencimiento', value: reward.expiresAt === null ? 'No vence' : formatDateOnly(reward.expiresAt) },
    ],
  };
}

const formatRewardPoints = (points: number): string => `${formatNumber(points)} pts`;
const formatRewardStock = (stock: number | null): string => (stock === null ? 'Sin límite' : formatNumber(stock));
const formatRewardExpiration = (expiresAt: string | null): string =>
  expiresAt === null ? 'No vence' : formatDateOnly(expiresAt);

export type RewardEditSnapshot = RewardSnapshot & { description: string | null };

// REWARD_UPDATED (§3.14.2, US-35): una fila por campo que cambió, "{antes} → {después}". Vacío =
// "—", sin límite = "Sin límite", sin fecha = "No vence"; los puntos con "pts" (decisión de Jazmín,
// igual que REWARD_CREATED). La description lleva el nombre nuevo. null si no cambió nada (no se
// audita).
export function rewardUpdatedEntry(
  actor: AuditActor,
  before: RewardEditSnapshot,
  after: RewardEditSnapshot,
): AuditEntryInput | null {
  const details = changedRows([
    { label: 'Nombre', before: before.name, after: after.name },
    { label: 'Descripción', before: orNone(before.description), after: orNone(after.description) },
    { label: 'Puntos', before: formatRewardPoints(before.points), after: formatRewardPoints(after.points) },
    { label: 'Stock', before: formatRewardStock(before.stock), after: formatRewardStock(after.stock) },
    { label: 'Vencimiento', before: formatRewardExpiration(before.expiresAt), after: formatRewardExpiration(after.expiresAt) },
  ]);
  if (details.length === 0) return null;
  return {
    actor,
    module: 'REWARDS',
    action: 'REWARD_UPDATED',
    description: `Editó la recompensa "${after.name}"`,
    details,
  };
}

// UI de RewardStatus (§2.1)
const REWARD_STATUS_LABELS = {
  ACTIVE: 'Activa',
  DISABLED: 'Deshabilitada',
  INACTIVE: 'Inactiva',
  DELETED: 'Dada de baja',
} as const;
export type RewardStatusCode = keyof typeof REWARD_STATUS_LABELS;

const statusChange = (before: RewardStatusCode, after: RewardStatusCode): AuditDetail => ({
  label: 'Estado',
  value: change(REWARD_STATUS_LABELS[before], REWARD_STATUS_LABELS[after]),
});

// REWARD_ACTIVATED (§3.2.5 y §3.14.2, US-36): "Estado: Inactiva → Activa" o "Inactiva →
// Deshabilitada" si no está disponible. No se audita además un REWARD_DISABLED (decisión de Jazmín:
// sería el mismo hecho dos veces).
export function rewardActivatedEntry(actor: AuditActor, rewardName: string, after: RewardStatusCode): AuditEntryInput {
  return {
    actor,
    module: 'REWARDS',
    action: 'REWARD_ACTIVATED',
    description: `Activó la recompensa "${rewardName}"`,
    details: [statusChange('INACTIVE', after)],
  };
}

// REWARD_DEACTIVATED (§3.2.6 y §3.14.2, US-36): "Estado: {antes} → Inactiva" y, solo si hubo,
// "Canjes rechazados: {n}"
export function rewardDeactivatedEntry(
  actor: AuditActor,
  rewardName: string,
  before: RewardStatusCode,
  rejectedRedemptions: number,
): AuditEntryInput {
  return {
    actor,
    module: 'REWARDS',
    action: 'REWARD_DEACTIVATED',
    description: `Desactivó la recompensa "${rewardName}"`,
    details: [
      statusChange(before, 'INACTIVE'),
      ...(rejectedRedemptions > 0 ? [{ label: 'Canjes rechazados', value: formatNumber(rejectedRedemptions) }] : []),
    ],
  };
}

// --- Canjes ------------------------------------------------------------------------------

export type RedemptionSnapshot = {
  // Código de 6 caracteres (§3.6.1)
  code: string;
  // Snapshot del nombre de la recompensa al confirmar
  rewardName: string;
};

// REDEMPTION_EXPIRED (contrato S4 §3.14.2, US-44): lo registra el Sistema. El código va en
// operationCode y como primera fila de details (§3.14, cambio respecto del Sprint 3).
export function redemptionExpiredEntry(
  customer: AffectedCustomerSnapshot,
  redemption: RedemptionSnapshot,
): AuditEntryInput {
  return {
    actor: { type: 'SYSTEM' },
    module: 'REDEMPTIONS',
    action: 'REDEMPTION_EXPIRED',
    description: `Venció el canje de ${fullName(customer)}`,
    affectedCustomer: affectedCustomerOf(customer),
    operationCode: redemption.code,
    details: [
      { label: 'Código del canje', value: redemption.code },
      { label: 'Recompensa', value: redemption.rewardName },
    ],
  };
}

export type RedemptionRejectionSnapshot = RedemptionSnapshot & {
  // El motivo guardado: el que escribió el empleado o el fijo del Sistema (§3.10.4)
  reason: string;
};

// REDEMPTION_REJECTED (contrato S4 §3.14.2, US-43): a nombre del empleado que lo rechazó, o del
// Sistema en los rechazos automáticos (§3.10.4). Detalles: Código del canje · Recompensa · Motivo.
export function redemptionRejectedEntry(
  actor: AuditActor,
  customer: AffectedCustomerSnapshot,
  redemption: RedemptionRejectionSnapshot,
): AuditEntryInput {
  return {
    actor,
    module: 'REDEMPTIONS',
    action: 'REDEMPTION_REJECTED',
    description: `Rechazó el canje de ${fullName(customer)}`,
    affectedCustomer: affectedCustomerOf(customer),
    operationCode: redemption.code,
    details: [
      { label: 'Código del canje', value: redemption.code },
      { label: 'Recompensa', value: redemption.rewardName },
      { label: 'Motivo', value: redemption.reason },
    ],
  };
}

// --- Consumos ----------------------------------------------------------------------------

// Monto con $ y puntos de miles, como el ejemplo de §3.9.4 ("$50.000"); con centavos, "$12.500,50"
const formatMoney = (amount: number): string =>
  `$${amount.toLocaleString('es-AR', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

export type ConsumptionRegistrationSnapshot = {
  code: string;
  amount: number;
  // Snapshot de la equivalencia del consumo (§3.3.3)
  baseAmount: number;
  pointsAwarded: number;
  // Total acreditado, bonificación incluida (decisión de Jazmín, igual que "Consumo registrado")
  totalPoints: number;
  bonusPoints: number;
  balanceAfter: number;
};

// CONSUMPTION_REGISTERED (US-21, §3.9.3). "Bonificación primer consumo" solo si es > 0.
export function consumptionRegisteredEntry(
  actor: AuditActor,
  customer: AffectedCustomerSnapshot,
  consumption: ConsumptionRegistrationSnapshot,
): AuditEntryInput {
  const details: AuditDetail[] = [
    { label: 'Código de operación', value: consumption.code },
    { label: 'Monto', value: formatMoney(consumption.amount) },
    {
      label: 'Equivalencia aplicada',
      value: `${formatMoney(consumption.baseAmount)} = ${formatNumber(consumption.pointsAwarded)} pts`,
    },
    { label: 'Puntos acreditados', value: formatSignedPoints(consumption.totalPoints) },
  ];
  if (consumption.bonusPoints > 0) {
    details.push({
      label: 'Bonificación primer consumo',
      value: formatSignedPoints(consumption.bonusPoints),
    });
  }
  details.push({ label: 'Saldo resultante', value: `${formatNumber(consumption.balanceAfter)} pts` });

  return {
    actor,
    module: 'CONSUMPTIONS',
    action: 'CONSUMPTION_REGISTERED',
    description: `Registró el consumo ${consumption.code} de ${fullName(customer)}`,
    affectedCustomer: affectedCustomerOf(customer),
    operationCode: consumption.code,
    details,
  };
}

export type ConsumptionVoidSnapshot = {
  code: string;
  amount: number;
  // Puntos revertidos (positivo): se muestran con signo menos
  totalPoints: number;
  balanceAfter: number;
  reason: string;
};

// CONSUMPTION_VOIDED (US-22, §3.9.3), con la forma del ejemplo de §3.9.4.
export function consumptionVoidedEntry(
  actor: AuditActor,
  customer: AffectedCustomerSnapshot,
  consumption: ConsumptionVoidSnapshot,
): AuditEntryInput {
  return {
    actor,
    module: 'CONSUMPTIONS',
    action: 'CONSUMPTION_VOIDED',
    description: `Anuló el consumo ${consumption.code} de ${fullName(customer)}`,
    affectedCustomer: affectedCustomerOf(customer),
    operationCode: consumption.code,
    details: [
      { label: 'Código de operación', value: consumption.code },
      { label: 'Monto', value: formatMoney(consumption.amount) },
      { label: 'Puntos revertidos', value: formatSignedPoints(-consumption.totalPoints) },
      { label: 'Saldo resultante', value: `${formatNumber(consumption.balanceAfter)} pts` },
      { label: 'Motivo', value: consumption.reason },
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
  // US-27: umbrales de nivel
  silverMinPoints: number;
  goldMinPoints: number;
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

export function firstConsumptionBonusChanged(before: LoyaltyConfigSnapshot, after: LoyaltyConfigSnapshot): boolean {
  return before.bonusType !== after.bonusType || before.bonusValue !== after.bonusValue;
}

export function levelsChanged(before: LoyaltyConfigSnapshot, after: LoyaltyConfigSnapshot): boolean {
  return before.silverMinPoints !== after.silverMinPoints || before.goldMinPoints !== after.goldMinPoints;
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

export function firstConsumptionBonusUpdatedEntry(
  actor: AuditActor,
  before: LoyaltyConfigSnapshot,
  after: LoyaltyConfigSnapshot,
): AuditEntryInput {
  return {
    actor,
    module: 'CONFIGURATION',
    action: 'FIRST_CONSUMPTION_BONUS_UPDATED',
    description: 'Modificó la bonificación por primer consumo',
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

// US-27 (§3.9.3): "Plata: {antes} → {después} pts · Oro: {antes} → {después} pts"
export function levelsUpdatedEntry(
  actor: AuditActor,
  before: LoyaltyConfigSnapshot,
  after: LoyaltyConfigSnapshot,
): AuditEntryInput {
  const levelRow = (label: string, from: number, to: number): AuditDetail => ({
    label,
    value: `${change(formatNumber(from), formatNumber(to))} pts`,
  });
  return {
    actor,
    module: 'CONFIGURATION',
    action: 'LEVELS_UPDATED',
    description: 'Modificó niveles',
    details: levelsChanged(before, after)
      ? [
          levelRow('Plata', before.silverMinPoints, after.silverMinPoints),
          levelRow('Oro', before.goldMinPoints, after.goldMinPoints),
        ]
      : [{ label: 'Cambios', value: NO_CHANGES }],
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
  if (firstConsumptionBonusChanged(before, after)) {
    entries.push(firstConsumptionBonusUpdatedEntry(actor, before, after));
  }
  if (levelsChanged(before, after)) {
    entries.push(levelsUpdatedEntry(actor, before, after));
  }
  return entries.length > 0 ? entries : [pointsEquivalenceUpdatedEntry(actor, before, after)];
}
