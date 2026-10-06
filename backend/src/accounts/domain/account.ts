import { AccountId } from './account-id.js';
import { DomainError } from './errors/domain.error.js';

export type AccountData = {
  employeeId: number;
  passwordHash: string;
};

// email: solo en el dato PERSISTIDO, no en el de alta (AccountData). Al crear (US-05) el
// email todavía no existe en la tabla — lo escribe el repositorio leyéndolo de Employee en
// el mismo INSERT (ver AccountPrismaRepository.save()). Una vez persistida, Account.email
// es la fuente directa para auth (verifyCredentials/findActiveById): sin esto, cada
// consulta tendría que volver a resolver Employee/Customer solo para obtener el email.
export type AccountPersistedData = AccountData & {
  id: number;
  email: string;
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

// Decisión del equipo: Account NO tiene role propio (Employee.role sigue siendo la única
// fuente de verdad para autorización). Account.email sí es un campo propio y real en
// Prisma (NOT NULL + UNIQUE): es la identidad de login, copiada de Employee.email al
// crear la cuenta y nunca editable desde este ABMC.
export class Account {
  private constructor(
    private readonly _id: AccountId | null,
    private readonly _employeeId: number,
    private readonly _email: string | null,
    private _passwordHash: string,
    private _active: boolean,
    private _deactivatedAt: Date | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // CREATE (US-05): toda cuenta nueva nace activa. El email todavía no existe en este
  // punto (lo persiste el repositorio leyéndolo de Employee) — queda null hasta que se
  // reconstruya desde la base real tras el INSERT.
  static create(data: AccountData): Account {
    const now = new Date();
    return new Account(
      null,
      requiredEmployeeId(data.employeeId),
      null,
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
      data.email,
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
  // null solo en una Account recién creada con Account.create() y todavía no persistida
  // (igual que getId()). Toda Account reconstruida desde la base (AccountRepository.find*)
  // siempre tiene email real.
  getEmail(): string | null { return this._email; }
  getPasswordHash(): string { return this._passwordHash; }
  isActive(): boolean { return this._active; }
  getDeactivatedAt(): Date | null { return this._deactivatedAt; }
  getCreatedAt(): Date { return this._createdAt; }
  getUpdatedAt(): Date { return this._updatedAt; }
}
