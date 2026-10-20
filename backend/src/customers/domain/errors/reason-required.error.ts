import { BadRequestException } from '@nestjs/common';

// Texto del contrato (§3.8.2). El contrato no define `code` para este error (decisión a pedido de
// Magali: sin code).
export const REASON_REQUIRED_MESSAGE = 'Indicá el motivo del cambio para continuar.';

// El Administrador editó un cliente sin indicar el motivo del cambio
export function reasonRequired(): BadRequestException {
  return new BadRequestException(REASON_REQUIRED_MESSAGE);
}
