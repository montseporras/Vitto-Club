import { ConsumptionId } from './consumption-id.js';
import { DomainError } from './errors/domain.error.js';

export const CONSUMPTION_STATUSES = ['REGISTERED', 'VOIDED'] as const;
export type ConsumptionStatus = (typeof CONSUMPTION_STATUSES)[number];

// Roles que pueden ver/anular un consumo (§3.2.1). Definido localmente, igual que
// AccountRole en accounts: este módulo no importa el dominio de otro solo por un tipo.
export type ConsumptionViewerRole = 'ADMIN' | 'CASHIER';

const CODE_PREFIX = 'C-';
const CODE_DIGITS = 6;
const CODE_PATTERN = /^C-\d{6}$/;

const MAX_AMOUNT = 9_999_999_999.99;
const MAX_NOTES = 255;
const MAX_NAME_SNAPSHOT = 161;
const MIN_VOID_REASON = 5;
const MAX_VOID_REASON = 500;

// Cajero: solo puede anular un consumo propio dentro de esta ventana desde el registro (§3.2).
const CASHIER_VOID_WINDOW_HOURS = 24;

function requiredPositiveInt(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainError(`Consumption ${field} must be a positive integer`, field);
  }
  return value;
}

function requiredNonNegativeInt(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new DomainError(`Consumption ${field} must be a non-negative integer`, field);
  }
  return value;
}

// Mismo criterio que PointsEquivalence (loyalty): > 0, hasta 2 decimales, tope de la
// columna DECIMAL(12,2) (§3.1.3, §3.12).
function requiredAmount(value: number, field: string): number {
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    value > MAX_AMOUNT ||
    Math.round(value * 100) / 100 !== value
  ) {
    throw new DomainError(
      `Consumption ${field} must be greater than 0, have no more than 2 decimal places, and be no greater than ${MAX_AMOUNT}`,
      field,
    );
  }
  return value;
}

function requiredName(value: string, field: string, max: number): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DomainError(`Consumption ${field} cannot be empty`, field);
  }
  if (normalized.length > max) {
    throw new DomainError(`Consumption ${field} cannot exceed ${max} characters`, field);
  }
  return normalized;
}

// Observaciones (decisión #6): opcional, hasta 255 caracteres. Vacío (o solo espacios) se
// guarda como null.
function optionalNotes(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (normalized.length > MAX_NOTES) {
    throw new DomainError(`Consumption notes cannot exceed ${MAX_NOTES} characters`, 'notes');
  }
  return normalized;
}

// Motivo de anulación (§3.2.2, CA-22.8): 5 a 500 caracteres, sin espacios en los extremos.
function requiredVoidReason(value: string): string {
  const normalized = value.trim();
  if (normalized.length < MIN_VOID_REASON || normalized.length > MAX_VOID_REASON) {
    throw new DomainError(
      `Consumption void reason must be between ${MIN_VOID_REASON} and ${MAX_VOID_REASON} characters`,
      'voidReason',
    );
  }
  return normalized;
}

// Datos de alta (US-21). points/bonusPoints ya vienen calculados (ver
// calculate-consumption-points.ts): esta entidad no decide la fórmula, solo valida que el
// resultado tenga la forma correcta y modela el estado/transiciones.
export type ConsumptionData = {
  customerId: number;
  amount: number;
  notes?: string | null;
  points: number;
  bonusPoints: number;
  // Snapshot de la configuración vigente al momento del alta (RF-014): un cambio posterior
  // de la equivalencia no modifica este consumo.
  configurationVersion: number;
  baseAmount: number;
  pointsAwarded: number;
  registeredByAccountId: number;
  registeredByName: string;
};

export type ConsumptionPersistedData = ConsumptionData & {
  id: number;
  status: ConsumptionStatus;
  createdAt: Date;
  voidedAt?: Date | null;
  voidedByAccountId?: number | null;
  voidedByName?: string | null;
  voidedReason?: string | null;
};

export type ConsumptionVoidEligibility = {
  canVoid: boolean;
  voidableUntil: Date | null;
};

// US-21/US-22. No tiene columna "code" propia: se deriva del id (§3.3.3). VOIDED es un
// estado final (decisión #11): no vuelve a REGISTERED, y no se agrega ningún estado nuevo.
export class Consumption {
  private constructor(
    private readonly _id: ConsumptionId | null,
    private readonly _customerId: number,
    private readonly _amount: number,
    private readonly _notes: string | null,
    private readonly _points: number,
    private readonly _bonusPoints: number,
    private readonly _configurationVersion: number,
    private readonly _baseAmount: number,
    private readonly _pointsAwarded: number,
    private readonly _registeredByAccountId: number,
    private readonly _registeredByName: string,
    private _status: ConsumptionStatus,
    private readonly _createdAt: Date,
    private _voidedAt: Date | null,
    private _voidedByAccountId: number | null,
    private _voidedByName: string | null,
    private _voidedReason: string | null,
  ) {}

  // CREATE (US-21): todo consumo nuevo nace REGISTERED, sin datos de anulación.
  static create(data: ConsumptionData): Consumption {
    return new Consumption(
      null,
      requiredPositiveInt(data.customerId, 'customerId'),
      requiredAmount(data.amount, 'amount'),
      optionalNotes(data.notes),
      requiredNonNegativeInt(data.points, 'points'),
      requiredNonNegativeInt(data.bonusPoints, 'bonusPoints'),
      requiredPositiveInt(data.configurationVersion, 'configurationVersion'),
      requiredAmount(data.baseAmount, 'baseAmount'),
      requiredPositiveInt(data.pointsAwarded, 'pointsAwarded'),
      requiredPositiveInt(data.registeredByAccountId, 'registeredByAccountId'),
      requiredName(data.registeredByName, 'registeredByName', MAX_NAME_SNAPSHOT),
      'REGISTERED',
      new Date(),
      null,
      null,
      null,
      null,
    );
  }

  static reconstruct(data: ConsumptionPersistedData): Consumption {
    return new Consumption(
      ConsumptionId.create(data.id),
      data.customerId,
      data.amount,
      data.notes ?? null,
      data.points,
      data.bonusPoints,
      data.configurationVersion,
      data.baseAmount,
      data.pointsAwarded,
      data.registeredByAccountId,
      data.registeredByName,
      data.status,
      data.createdAt,
      data.voidedAt ?? null,
      data.voidedByAccountId ?? null,
      data.voidedByName ?? null,
      data.voidedReason ?? null,
    );
  }

  // US-22: anular. Revertir los puntos y auditar NO es responsabilidad de esta entidad
  // (eso lo hacen PointsService/AuditService, todavía no implementados) — esto solo mueve
  // el propio estado del consumo.
  void(data: { voidedByAccountId: number; voidedByName: string; reason: string }): void {
    if (this._status === 'VOIDED') {
      throw new DomainError('Consumption is already voided');
    }
    this._status = 'VOIDED';
    this._voidedAt = new Date();
    this._voidedByAccountId = requiredPositiveInt(data.voidedByAccountId, 'voidedByAccountId');
    this._voidedByName = requiredName(data.voidedByName, 'voidedByName', MAX_NAME_SNAPSHOT);
    this._voidedReason = requiredVoidReason(data.reason);
  }

  // §3.2.1: canVoid/voidableUntil calculados para quien consulta.
  getVoidEligibility(
    viewer: { role: ConsumptionViewerRole; accountId: number },
    now: Date = new Date(),
  ): ConsumptionVoidEligibility {
    if (viewer.role === 'ADMIN') {
      return { canVoid: this.isRegistered(), voidableUntil: null };
    }

    const isOwn = viewer.accountId === this._registeredByAccountId;
    if (!isOwn) {
      return { canVoid: false, voidableUntil: null };
    }

    const voidableUntil = new Date(
      this._createdAt.getTime() + CASHIER_VOID_WINDOW_HOURS * 60 * 60 * 1000,
    );
    return { canVoid: this.isRegistered() && now < voidableUntil, voidableUntil };
  }

  // Código visible (§3.3.3): "C-" + id, con ceros a la izquierda hasta 6 dígitos. No se
  // guarda aparte; se deriva siempre del id.
  static deriveCode(id: number): string {
    return `${CODE_PREFIX}${String(id).padStart(CODE_DIGITS, '0')}`;
  }

  // Inverso de deriveCode. null si :code no respeta el formato ^C-\d{6}$ (CA-22.9) — el
  // llamador decide si eso es un 400.
  static parseCode(code: string): number | null {
    if (!CODE_PATTERN.test(code)) return null;
    return Number(code.slice(CODE_PREFIX.length));
  }

  // GETTERS
  getId(): number | null {
    return this._id ? this._id.getValue() : null;
  }
  getCode(): string | null {
    return this._id ? Consumption.deriveCode(this._id.getValue()) : null;
  }
  getCustomerId(): number {
    return this._customerId;
  }
  getAmount(): number {
    return this._amount;
  }
  getNotes(): string | null {
    return this._notes;
  }
  getPoints(): number {
    return this._points;
  }
  getBonusPoints(): number {
    return this._bonusPoints;
  }
  getTotalPoints(): number {
    return this._points + this._bonusPoints;
  }
  getConfigurationVersion(): number {
    return this._configurationVersion;
  }
  getBaseAmount(): number {
    return this._baseAmount;
  }
  getPointsAwarded(): number {
    return this._pointsAwarded;
  }
  getRegisteredByAccountId(): number {
    return this._registeredByAccountId;
  }
  getRegisteredByName(): string {
    return this._registeredByName;
  }
  getStatus(): ConsumptionStatus {
    return this._status;
  }
  isRegistered(): boolean {
    return this._status === 'REGISTERED';
  }
  isVoided(): boolean {
    return this._status === 'VOIDED';
  }
  getCreatedAt(): Date {
    return this._createdAt;
  }
  getVoidedAt(): Date | null {
    return this._voidedAt;
  }
  getVoidedByAccountId(): number | null {
    return this._voidedByAccountId;
  }
  getVoidedByName(): string | null {
    return this._voidedByName;
  }
  getVoidedReason(): string | null {
    return this._voidedReason;
  }
}
