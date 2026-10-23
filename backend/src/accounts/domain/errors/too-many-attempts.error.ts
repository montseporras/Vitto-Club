import { HttpException, HttpStatus } from '@nestjs/common';

// Código fijo del contrato (§3.10.4, §3.11.1 y §5).
export const TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS';
export const TOO_MANY_ATTEMPTS_MESSAGE = 'Hiciste demasiados intentos. Probá de nuevo en unos minutos.';

export function tooManyAttempts(): HttpException {
  return new HttpException(
    { message: TOO_MANY_ATTEMPTS_MESSAGE, code: TOO_MANY_ATTEMPTS },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}
