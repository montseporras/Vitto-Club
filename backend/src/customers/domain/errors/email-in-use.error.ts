import { ConflictException } from '@nestjs/common';

// Código fijo del contrato (§5): el frontend decide por esto, no por el texto del mensaje.
export const EMAIL_IN_USE = 'EMAIL_IN_USE';

// Decisión tomada a pedido de Magali (US-17-AJ): el contrato no define el texto.
export const EMAIL_IN_USE_MESSAGE = 'Ya hay un cliente o una cuenta activa con ese mail.';

// Alta de cliente con un email que ya usa otro cliente o empleado activo
export function emailInUse(): ConflictException {
  return new ConflictException({ message: EMAIL_IN_USE_MESSAGE, code: EMAIL_IN_USE });
}
