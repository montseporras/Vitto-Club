import { UnauthorizedException } from '@nestjs/common';

// Contrato S5 §3.3.3: "Cliente dado de baja con token vivo: 401, como el resto de /customers/me". Lo usan
// las dos rutas de /customers/me/misiones: el reclamo (US-31) y la consulta (US-33), decisión de Jazmín.
export function customerUnauthenticated(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    error: 'Unauthorized',
    message: 'Authentication required',
    code: 'UNAUTHENTICATED',
  });
}
