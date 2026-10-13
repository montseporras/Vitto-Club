import { DomainError } from './errors/domain.error.js';

export type SessionStartData = {
  accountId: number;
  tokenHash: string;
  now: Date;
  // Plazo sin actividad tras el cual la sesión vence
  inactivityMs: number;
  // Duración máxima de la sesión, aunque el usuario siga activo
  absoluteMs: number;
};

export type SessionPersistedData = {
  id: number;
  accountId: number;
  tokenHash: string;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
};

function requiredAccountId(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainError('Session accountId must be a positive integer', 'accountId');
  }
  return value;
}

function requiredTokenHash(value: string): string {
  if (!value) {
    throw new DomainError('Session tokenHash cannot be empty', 'tokenHash');
  }
  return value;
}

function positiveDuration(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DomainError(`Session ${field} must be a positive number of milliseconds`, field);
  }
  return value;
}

function earliest(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

// Una sesión iniciada. El refresh token se rota en el lugar: la misma sesión cambia de
// tokenHash en cada renovación.
// Tiene dos vencimientos:
// - expiresAt: por inactividad. Se corre hacia adelante en cada renovación.
// - absoluteExpiresAt: tope máximo. Se fija al iniciar y no cambia nunca.
// Ninguna operación lee el reloj por su cuenta: "ahora" siempre llega por parámetro.
export class Session {
  private constructor(
    private readonly _id: number | null,
    private readonly _accountId: number,
    private _tokenHash: string,
    private _expiresAt: Date,
    private readonly _absoluteExpiresAt: Date,
    private _revokedAt: Date | null,
    private readonly _createdAt: Date,
  ) {}

  // INICIAR (login)
  static start(data: SessionStartData): Session {
    const accountId = requiredAccountId(data.accountId);
    const tokenHash = requiredTokenHash(data.tokenHash);
    const inactivityMs = positiveDuration(data.inactivityMs, 'inactivityMs');
    const absoluteMs = positiveDuration(data.absoluteMs, 'absoluteMs');

    const nowMs = data.now.getTime();
    const absoluteExpiresAt = new Date(nowMs + absoluteMs);
    const expiresAt = earliest(new Date(nowMs + inactivityMs), absoluteExpiresAt);

    return new Session(null, accountId, tokenHash, expiresAt, absoluteExpiresAt, null, new Date(nowMs));
  }

  static reconstruct(data: SessionPersistedData): Session {
    return new Session(
      data.id,
      data.accountId,
      data.tokenHash,
      data.expiresAt,
      data.absoluteExpiresAt,
      data.revokedAt ?? null,
      data.createdAt,
    );
  }

  // Vigente = no revocada y anterior a los dos vencimientos
  isUsable(now: Date): boolean {
    const nowMs = now.getTime();
    return (
      this._revokedAt === null &&
      nowMs < this._expiresAt.getTime() &&
      nowMs < this._absoluteExpiresAt.getTime()
    );
  }

  // RENOVAR (refresh): cambia el token y corre el vencimiento por inactividad, sin pasar
  // nunca del tope máximo.
  rotate(newTokenHash: string, now: Date, inactivityMs: number): void {
    if (!this.isUsable(now)) {
      throw new DomainError('Session is expired or revoked');
    }
    const tokenHash = requiredTokenHash(newTokenHash);
    const inactivity = positiveDuration(inactivityMs, 'inactivityMs');

    this._tokenHash = tokenHash;
    this._expiresAt = earliest(new Date(now.getTime() + inactivity), this._absoluteExpiresAt);
  }

  // REVOCAR (logout o baja de la cuenta). Repetirlo no es un error: se conserva la primera fecha.
  revoke(now: Date): void {
    if (this._revokedAt !== null) return;
    this._revokedAt = new Date(now.getTime());
  }

  // GETTERS
  getId(): number | null { return this._id; }
  getAccountId(): number { return this._accountId; }
  getTokenHash(): string { return this._tokenHash; }
  getExpiresAt(): Date { return this._expiresAt; }
  getAbsoluteExpiresAt(): Date { return this._absoluteExpiresAt; }
  getRevokedAt(): Date | null { return this._revokedAt; }
  getCreatedAt(): Date { return this._createdAt; }
}
