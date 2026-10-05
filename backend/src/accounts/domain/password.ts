import { DomainError } from './errors/domain.error.js';

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 64;

// Value object transitorio: valida la contraseña en texto plano ANTES de hashearla.
// Nunca se persiste ni se loguea — Account solo conoce el passwordHash resultante
// (ver domain/port/password-hasher.ts, cuya implementación concreta la provee auth).
// Límites alineados con los que ya usa prisma/seed.ts (PASSWORD_MIN/PASSWORD_MAX).
export class Password {
  private constructor(private readonly value: string) {}

  static create(value: string): Password {
    if (!value) {
      throw new DomainError('Password cannot be empty', 'password');
    }
    if (value.length < MIN_PASSWORD_LENGTH) {
      throw new DomainError(`Password must have at least ${MIN_PASSWORD_LENGTH} characters`, 'password');
    }
    if (value.length > MAX_PASSWORD_LENGTH) {
      throw new DomainError(`Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`, 'password');
    }
    return new Password(value);
  }

  getValue(): string {
    return this.value;
  }
}
