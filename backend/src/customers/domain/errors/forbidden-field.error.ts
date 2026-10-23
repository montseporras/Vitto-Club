import { ForbiddenException } from '@nestjs/common';

// Código fijo del contrato (§5, §3.8.2)
export const FORBIDDEN_FIELD = 'FORBIDDEN_FIELD';

// Texto que el contrato dice que ya muestra la pantalla del Cajero (§3.8.2).
export const FORBIDDEN_FIELD_MESSAGE = 'El documento no se puede modificar.';

// El Cajero mandó documentType o documentNumber: solo el Administrador los corrige
export function forbiddenField(): ForbiddenException {
  return new ForbiddenException({ message: FORBIDDEN_FIELD_MESSAGE, code: FORBIDDEN_FIELD });
}
