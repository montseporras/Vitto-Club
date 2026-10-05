import { AccountId } from './account-id.js';
import { DomainError } from './errors/domain.error.js';

export type AccountData = {
  employeeId: number;
  passwordHash: string;
};

export type AccountPersistedData = AccountData & {
  id: number;
  active: boolean;
  deactivatedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function requiredPasswordHash(value: string): string {
  if (!value) {
    throw new DomainError('Account passwordHash cannot be empty', 'passwordHash');
  }
  return value;
}

function requiredEmployeeId(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainError('Account employeeId must be a positive integer', 'employeeId');
  }
  return value;
}

// Decisión del equipo (provisional hasta integrar la rama de auth): Account NO tiene
// email ni role propios. El email de acceso es Employee.email y el rol es Employee.role
// (fuente de verdad única). Account modela solo la credencial: a qué Employee pertenece,
// el hash de su contraseña, y si está activa.
export class Account {
  private constructor(
    private readonly _id: AccountId | null,
    private readonly _employeeId: number,
    private _passwordHash: string,
    private _active: boolean,
    private _deactivatedAt: Date | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // CREATE (US-05): toda cuenta nueva nace activa
  static create(data: AccountData): Account {
    const now = new Date();
    return new Account(
      null,
      requiredEmployeeId(data.employeeId),
      requiredPasswordHash(data.passwordHash),
      true,
      null,
      now,
      now,
    );
  }

  static reconstruct(data: AccountPersistedData): Account {
    return new Account(
      AccountId.create(data.id),
      data.employeeId,
      data.passwordHash,
      data.active,
      data.deactivatedAt ?? null,
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
    );
  }

  // US-06: resetear contraseña. Recibe el hash ya calculado por PasswordHasher
  // (el dominio nunca ve la contraseña en texto plano).
  changePasswordHash(newPasswordHash: string): void {
    this._passwordHash = requiredPasswordHash(newPasswordHash);
    this._updatedAt = new Date();
  }

  // US-07: baja lógica. El registro se conserva, nunca se borra.
  deactivate(): void {
    if (!this._active) {
      throw new DomainError('Account is already inactive');
    }
    this._active = false;
    this._deactivatedAt = new Date();
    this._updatedAt = new Date();
  }

  // GETTERS
  getId(): number | null { return this._id ? this._id.getValue() : null; }
  getEmployeeId(): number { return this._employeeId; }
  getPasswordHash(): string { return this._passwordHash; }
  isActive(): boolean { return this._active; }
  getDeactivatedAt(): Date | null { return this._deactivatedAt; }
  getCreatedAt(): Date { return this._createdAt; }
  getUpdatedAt(): Date { return this._updatedAt; }
}
