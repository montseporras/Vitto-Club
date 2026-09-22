import { CustomerId } from './customer-id.js';
import { Mail } from './mail.js';
import { DomainError } from './errors/domain.error.js';

export const DOCUMENT_TYPES = ['DNI', 'PASSPORT'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type CustomerData = {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: Date | null;
};

export type CustomerPersistedData = CustomerData & {
  id: number;
  active: boolean;
  deactivatedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

// Límites alineados con las columnas VarChar del schema
const MAX_NAME = 80;
const MAX_DOCUMENT = 20;
const MAX_PHONE = 30;

// Teléfono: opcional, puede empezar con "+", solo dígitos, espacios, guiones, puntos y paréntesis,
// y entre 8 y 15 dígitos en total (largo máximo de un número internacional).
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;
const PHONE_MIN_DIGITS = 8;
const PHONE_MAX_DIGITS = 15;

function requiredText(value: string, field: string, max: number): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DomainError(`Customer ${field} cannot be empty`, field);
  }
  if (normalized.length > max) {
    throw new DomainError(`Customer ${field} cannot exceed ${max} characters`, field);
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
      `Customer phone is invalid: use digits, spaces, "+", "-", "(" and ")", with ${PHONE_MIN_DIGITS} to ${PHONE_MAX_DIGITS} digits`,
      'phone',
    );
  }
  return normalized;
}

function validDocumentType(type: DocumentType): DocumentType {
  if (!DOCUMENT_TYPES.includes(type)) {
    throw new DomainError(
      `Customer documentType must be one of: ${DOCUMENT_TYPES.join(', ')}`,
      'documentType',
    );
  }
  return type;
}

// Sin puntos, espacios ni guiones, en mayúsculas: protege el unique (documentType, documentNumber)
export function normalizeDocumentNumber(value: string): string {
  const normalized = value.replace(/[\s.-]/g, '').toUpperCase();
  if (!normalized) {
    throw new DomainError('Customer documentNumber cannot be empty', 'documentNumber');
  }
  if (normalized.length > MAX_DOCUMENT) {
    throw new DomainError(
      `Customer documentNumber cannot exceed ${MAX_DOCUMENT} characters`,
      'documentNumber',
    );
  }
  return normalized;
}

function validBirthDate(date: Date | null | undefined): Date | null {
  if (!date) return null;
  if (Number.isNaN(date.getTime()) || date > new Date()) {
    throw new DomainError('Customer dateOfBirth is invalid', 'dateOfBirth');
  }
  return date;
}

export class Customer {
  private constructor(
    private readonly _id: CustomerId | null,
    private _firstName: string,
    private _lastName: string,
    private _documentType: DocumentType,
    private _documentNumber: string,
    private _email: Mail,
    private _phone: string | null,
    private _dateOfBirth: Date | null,
    private _active: boolean,
    private _deactivatedAt: Date | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // CREATE
  static create(data: CustomerData): Customer {
    const now = new Date();

    return new Customer(
      null,
      requiredText(data.firstName, 'firstName', MAX_NAME),
      requiredText(data.lastName, 'lastName', MAX_NAME),
      validDocumentType(data.documentType),
      normalizeDocumentNumber(data.documentNumber),
      Mail.create(data.email),
      optionalPhone(data.phone),
      validBirthDate(data.dateOfBirth),
      true,
      null,
      now,
      now,
    );
  }

  static reconstruct(data: CustomerPersistedData): Customer {
    return new Customer(
      CustomerId.create(data.id),
      data.firstName,
      data.lastName,
      data.documentType,
      data.documentNumber,
      Mail.create(data.email),
      data.phone ?? null,
      data.dateOfBirth ?? null,
      data.active,
      data.deactivatedAt ?? null,
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
    );
  }

  // UPDATE: solo se modifican los campos recibidos (undefined = sin cambios; phone null/'' = borrar)
  update(data: Partial<CustomerData>): void {
    if (data.firstName !== undefined) this.setFirstName(data.firstName);
    if (data.lastName !== undefined) this.setLastName(data.lastName);
    if (data.documentType !== undefined) this.setDocumentType(data.documentType);
    if (data.documentNumber !== undefined) this.setDocumentNumber(data.documentNumber);
    if (data.email !== undefined) this.setEmail(data.email);
    if (data.phone !== undefined) this.setPhone(data.phone);
    if (data.dateOfBirth !== undefined) this.setDateOfBirth(data.dateOfBirth);
    this._updatedAt = new Date();
  }

  // Baja lógica
  deactivate(): void {
    if (!this._active) {
      throw new DomainError('Customer is already inactive');
    }
    this._active = false;
    this._deactivatedAt = new Date();
    this._updatedAt = new Date();
  }

  // Alta lógica
  activate(): void {
    if (this._active) {
      throw new DomainError('Customer is already active');
    }
    this._active = true;
    this._deactivatedAt = null;
    this._updatedAt = new Date();
  }

  // CHANGE METHODS
  setFirstName(firstName: string): void {
    this._firstName = requiredText(firstName, 'firstName', MAX_NAME);
  }

  setLastName(lastName: string): void {
    this._lastName = requiredText(lastName, 'lastName', MAX_NAME);
  }

  setDocumentType(documentType: DocumentType): void {
    this._documentType = validDocumentType(documentType);
  }

  setDocumentNumber(documentNumber: string): void {
    this._documentNumber = normalizeDocumentNumber(documentNumber);
  }

  setEmail(email: string): void {
    this._email = Mail.create(email);
  }

  setPhone(phone: string | null): void {
    this._phone = optionalPhone(phone);
  }

  setDateOfBirth(dateOfBirth: Date | null): void {
    this._dateOfBirth = validBirthDate(dateOfBirth);
  }

  // GETTERS
  getId(): number | null { return this._id ? this._id.getValue() : null; }
  getFirstName(): string { return this._firstName; }
  getLastName(): string { return this._lastName; }
  getDocumentType(): DocumentType { return this._documentType; }
  getDocumentNumber(): string { return this._documentNumber; }
  getEmail(): string { return this._email.getValue(); }
  getPhone(): string | null { return this._phone; }
  getDateOfBirth(): Date | null { return this._dateOfBirth; }
  isActive(): boolean { return this._active; }
  getDeactivatedAt(): Date | null { return this._deactivatedAt; }
  getCreatedAt(): Date { return this._createdAt; }
  getUpdatedAt(): Date { return this._updatedAt; }
}
