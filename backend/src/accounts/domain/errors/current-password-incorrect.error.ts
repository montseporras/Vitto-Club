import { BadRequestException } from '@nestjs/common';

// Código fijo del contrato (§3.10.4, §3.11.1 y §5).
export const CURRENT_PASSWORD_INCORRECT = 'CURRENT_PASSWORD_INCORRECT';
export const CURRENT_PASSWORD_INCORRECT_MESSAGE = 'La contraseña actual es incorrecta';

// Es 400 y no 401 a propósito: un 401 haría que el interceptor del frontend intente renovar la
// sesión o mande al login a alguien que solo se equivocó de contraseña.
export function currentPasswordIncorrect(): BadRequestException {
  return new BadRequestException({
    message: CURRENT_PASSWORD_INCORRECT_MESSAGE,
    code: CURRENT_PASSWORD_INCORRECT,
  });
}
