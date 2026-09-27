import { DomainError } from './errors/domain.error.js';

// Mismo criterio que el Mail de customers: se guarda en minúsculas y sin espacios.
export class Mail {
  private constructor(private readonly value: string) {}

  static create(value: string): Mail {
    const normalizedValue = value.trim().toLowerCase();

    if (!normalizedValue) {
      throw new DomainError('Mail cannot be empty', 'email');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedValue)) {
      throw new DomainError('Invalid email format', 'email');
    }

    return new Mail(normalizedValue);
  }

  getValue(): string {
    return this.value;
  }
}
