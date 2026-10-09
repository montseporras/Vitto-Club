import { DomainError } from './errors/domain.error.js';

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 64;
// bcrypt solo mira los primeros 72 BYTES y descarta el resto sin avisar: con letras con tilde
// (2 bytes cada una), 64 caracteres pueden ser 128 bytes y dos contraseñas distintas
// verificarían igual. Se limita también el largo en bytes (UTF-8).
const MAX_PASSWORD_BYTES = 72;

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
    if (Buffer.byteLength(value, 'utf8') > MAX_PASSWORD_BYTES) {
      throw new DomainError(
        `Password cannot exceed ${MAX_PASSWORD_BYTES} bytes (accented characters count as 2)`,
        'password',
      );
    }
    return new Password(value);
  }

  getValue(): string {
    return this.value;
  }
}
