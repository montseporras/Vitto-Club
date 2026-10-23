import { BadRequestException } from '@nestjs/common';

// Decisión tomada a pedido de Magali (CLI-ADM): el contrato dice 400 pero no da el texto (§3.8.1).
export const SEARCH_CONFLICT_MESSAGE = 'No se puede buscar por q y por name a la vez.';

// GET /customers con q y name juntos
export function searchConflict(): BadRequestException {
  return new BadRequestException(SEARCH_CONFLICT_MESSAGE);
}
