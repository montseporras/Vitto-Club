import { DomainError } from './errors/domain.error.js';

export const POINTS_LOT_STATUSES = ['ACTIVE', 'CONSUMED', 'EXPIRED', 'VOIDED'] as const;
export type PointsLotStatus = (typeof POINTS_LOT_STATUSES)[number];

function requiredPositiveInt(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainError(`PointsLot ${field} must be a positive integer`, field);
  }
  return value;
}

// Dato de alta (CA-BASE.3/CA-BASE.5): un lote nace ACTIVE, con remaining = initial.
// consumptionId es null para los lotes creados por un ajuste ADD (US-24, fuera de mi
// alcance por ahora, pero el dato ya lo admite).
export type PointsLotData = {
  customerId: number;
  consumptionId: number | null;
  initialPoints: number;
  accreditedAt: Date;
  expiresAt: Date;
};

export type PointsLotPersistedData = PointsLotData & {
  id: number;
  remainingPoints: number;
  status: PointsLotStatus;
  expiredAt?: Date | null;
};

// Lote de puntos acreditados, con su propio vencimiento (snapshot de la vigencia al
// acreditar). CA-BASE.4: al anular el consumo que lo originó, el lote se invalida entero
// (voidOrigin), sin importar cuánto quedaba disponible — lo no recuperado lo convierte en
// deuda quien orquesta (PointsService), no esta entidad.
export class PointsLot {
  private constructor(
    private readonly _id: number | null,
    private readonly _customerId: number,
    private readonly _consumptionId: number | null,
    private readonly _initialPoints: number,
    private _remainingPoints: number,
    private readonly _accreditedAt: Date,
    private readonly _expiresAt: Date,
    private _status: PointsLotStatus,
    private _expiredAt: Date | null,
  ) {}

  static create(data: PointsLotData): PointsLot {
    const initialPoints = requiredPositiveInt(data.initialPoints, 'initialPoints');
    return new PointsLot(
      null,
      requiredPositiveInt(data.customerId, 'customerId'),
      data.consumptionId,
      initialPoints,
      initialPoints,
      data.accreditedAt,
      data.expiresAt,
      'ACTIVE',
      null,
    );
  }

  static reconstruct(data: PointsLotPersistedData): PointsLot {
    return new PointsLot(
      data.id,
      data.customerId,
      data.consumptionId,
      data.initialPoints,
      data.remainingPoints,
      data.accreditedAt,
      data.expiresAt,
      data.status,
      data.expiredAt ?? null,
    );
  }

  // US-24 SUBTRACT (FIFO): descuenta hasta `amount` del lote. Pasa a CONSUMED si llega a 0.
  consume(amount: number): void {
    if (!Number.isInteger(amount) || amount < 0 || amount > this._remainingPoints) {
      throw new DomainError('Cannot consume more points than the lot has remaining', 'remainingPoints');
    }
    this._remainingPoints -= amount;
    if (this._remainingPoints === 0) {
      this._status = 'CONSUMED';
    }
  }

  // US-22: al anular el consumo que generó este lote, se descuenta lo que quede
  // disponible y el lote se invalida entero, aunque no llegue a 0 por sí solo.
  voidOrigin(amount: number): void {
    this.consume(amount);
    this._status = 'VOIDED';
  }

  // US-25 (§3.6.3): el lote vence entero, con lo que le quede. Pasa a EXPIRED, guarda la fecha
  // y el saldo queda en 0 (decisión de Melisa). Devuelve los puntos que vencieron.
  // La fecha que manda es la del lote (snapshot): un cambio posterior de vigencia no la corre.
  expire(now: Date): number {
    if (this._status !== 'ACTIVE') {
      throw new DomainError('Only an ACTIVE lot can expire', 'status');
    }
    if (this._expiresAt.getTime() > now.getTime()) {
      throw new DomainError('The lot has not expired yet', 'expiresAt');
    }
    if (this._remainingPoints === 0) {
      throw new DomainError('A lot without remaining points does not expire', 'remainingPoints');
    }
    const expired = this._remainingPoints;
    this._remainingPoints = 0;
    this._status = 'EXPIRED';
    this._expiredAt = now;
    return expired;
  }

  // GETTERS
  getId(): number | null {
    return this._id;
  }
  getCustomerId(): number {
    return this._customerId;
  }
  getConsumptionId(): number | null {
    return this._consumptionId;
  }
  getInitialPoints(): number {
    return this._initialPoints;
  }
  getRemainingPoints(): number {
    return this._remainingPoints;
  }
  getAccreditedAt(): Date {
    return this._accreditedAt;
  }
  getExpiresAt(): Date {
    return this._expiresAt;
  }
  getStatus(): PointsLotStatus {
    return this._status;
  }
  isActive(): boolean {
    return this._status === 'ACTIVE';
  }
  getExpiredAt(): Date | null {
    return this._expiredAt;
  }
}
