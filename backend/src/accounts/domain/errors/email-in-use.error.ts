import { ConflictException } from '@nestjs/common';

// Mismo código y texto que el alta de cliente en customers (contrato §5). Cada módulo tiene su
// copia para no importar el domain del otro.
export const EMAIL_IN_USE = 'EMAIL_IN_USE';
export const EMAIL_IN_USE_MESSAGE = 'Ya hay un cliente o una cuenta activa con ese mail.';

// El email ya lo usa otra cuenta activa
export function emailInUse(): ConflictException {
  return new ConflictException({ message: EMAIL_IN_USE_MESSAGE, code: EMAIL_IN_USE });
}

// Texto del contrato para el cambio de correo desde Mi perfil (§3.10.4)
export const PROFILE_EMAIL_IN_USE_MESSAGE = 'Ese correo ya está registrado';

export function profileEmailInUse(): ConflictException {
  return new ConflictException({ message: PROFILE_EMAIL_IN_USE_MESSAGE, code: EMAIL_IN_USE });
}

// Texto del contrato para la reactivación de un usuario de empleado (§3.11.4)
export const REACTIVATION_EMAIL_IN_USE_MESSAGE = 'El mail de este usuario ya lo usa otra cuenta activa.';

export function reactivationEmailInUse(): ConflictException {
  return new ConflictException({ message: REACTIVATION_EMAIL_IN_USE_MESSAGE, code: EMAIL_IN_USE });
}
