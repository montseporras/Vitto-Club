import { ConflictException } from '@nestjs/common';

// Código fijo del contrato (§5): el frontend decide por esto, no por el texto del mensaje.
export const CUSTOMER_INACTIVE = 'CUSTOMER_INACTIVE';

// Decisión tomada a pedido de Magali (CLI-ADM): el contrato no da status ni texto para editar un
// cliente inactivo; se usa el 409 y el texto que el contrato ya define para este código (§3.5).
export const CUSTOMER_INACTIVE_MESSAGE = 'El cliente está dado de baja.';

// Un cliente dado de baja es de solo lectura: no se edita (no hay reactivación)
export function customerInactive(): ConflictException {
  return new ConflictException({ message: CUSTOMER_INACTIVE_MESSAGE, code: CUSTOMER_INACTIVE });
}
