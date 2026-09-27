import { EmployeeId } from './employee-id.js';
import { Mail } from './mail.js';
import { DomainError } from './errors/domain.error.js';

export const EMPLOYEE_ROLES = ['ADMIN', 'CASHIER'] as const;
export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export type EmployeeData = {
  firstName: string;
  lastName: string;
  email: string;
  role: EmployeeRole;
  phone?: string | null;
};

// Datos editables (US-02). El email queda afuera: no se puede modificar.
export type EmployeeUpdateData = {
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  phone?: string | null; // ausente o null = sin teléfono
};

export type EmployeePersistedData = EmployeeData & {
  id: number;
  active: boolean;
  deactivatedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

// Límites alineados con las columnas VarChar del schema
const MAX_NAME = 80;
const MAX_PHONE = 30;

// Teléfono: opcional, puede empezar con "+", solo dígitos, espacios, guiones, puntos y paréntesis,
// y entre 8 y 15 dígitos en total (mismo criterio que customers).
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;
const PHONE_MIN_DIGITS = 8;
const PHONE_MAX_DIGITS = 15;

function requiredText(value: string, field: string, max: number): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DomainError(`Employee ${field} cannot be empty`, field);
  }
  if (normalized.length > max) {
    throw new DomainError(`Employee ${field} cannot exceed ${max} characters`, field);
  }
  return normalized;
}

function optionalPhone(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  const digits = normalized.replace(/\D/g, '').length;
  if (
    normalized.length > MAX_PHONE ||
    !PHONE_PATTERN.test(normalized) ||
    digits < PHONE_MIN_DIGITS ||
    digits > PHONE_MAX_DIGITS
  ) {
    throw new DomainError(
      `Employee phone is invalid: use digits, spaces, "+", "-", "(" and ")", with ${PHONE_MIN_DIGITS} to ${PHONE_MAX_DIGITS} digits`,
      'phone',
    );
  }
  return normalized;
}

function validRole(role: EmployeeRole): EmployeeRole {
  if (!EMPLOYEE_ROLES.includes(role)) {
    throw new DomainError(`Employee role must be one of: ${EMPLOYEE_ROLES.join(', ')}`, 'role');
  }
  return role;
}

export class Employee {
  private constructor(
    private readonly _id: EmployeeId | null,
    private _firstName: string,
    private _lastName: string,
    private _email: Mail,
    private _role: EmployeeRole,
    private _phone: string | null,
    private _active: boolean,
    private _deactivatedAt: Date | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // CREATE: todo empleado nuevo nace activo
  static create(data: EmployeeData): Employee {
    const now = new Date();

    return new Employee(
      null,
      requiredText(data.firstName, 'firstName', MAX_NAME),
      requiredText(data.lastName, 'lastName', MAX_NAME),
      Mail.create(data.email),
      validRole(data.role),
      optionalPhone(data.phone),
      true,
      null,
      now,
      now,
    );
  }

  static reconstruct(data: EmployeePersistedData): Employee {
    return new Employee(
      EmployeeId.create(data.id),
      data.firstName,
      data.lastName,
      Mail.create(data.email),
      data.role,
      data.phone ?? null,
      data.active,
      data.deactivatedAt ?? null,
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
    );
  }

  // UPDATE: reemplaza los datos editables. Se valida todo antes de asignar,
  // así un dato inválido no deja la entidad modificada a medias.
  update(data: EmployeeUpdateData): void {
    const firstName = requiredText(data.firstName, 'firstName', MAX_NAME);
    const lastName = requiredText(data.lastName, 'lastName', MAX_NAME);
    const role = validRole(data.role);
    const phone = optionalPhone(data.phone);

    this._firstName = firstName;
    this._lastName = lastName;
    this._role = role;
    this._phone = phone;
    this._updatedAt = new Date();
  }

  // Baja lógica (US-04): solo cambia el estado, el resto de los datos se conserva
  deactivate(): void {
    if (!this._active) {
      throw new DomainError('Employee is already inactive');
    }
    this._active = false;
    this._deactivatedAt = new Date();
    this._updatedAt = new Date();
  }

  // GETTERS
  getId(): number | null { return this._id ? this._id.getValue() : null; }
  getFirstName(): string { return this._firstName; }
  getLastName(): string { return this._lastName; }
  getEmail(): string { return this._email.getValue(); }
  getRole(): EmployeeRole { return this._role; }
  getPhone(): string | null { return this._phone; }
  isActive(): boolean { return this._active; }
  getDeactivatedAt(): Date | null { return this._deactivatedAt; }
  getCreatedAt(): Date { return this._createdAt; }
  getUpdatedAt(): Date { return this._updatedAt; }
}
