import type { AuthResult } from '../../application/auth.service.js';

// Respuesta del login y de la renovación: idéntica en los dos casos.
// El refresh token NO va acá: viaja solo en la cookie httpOnly.
export class AuthResponseDto {
  accessToken!: string;
  user!: {
    accountId: number;
    role: 'ADMIN' | 'CASHIER' | 'CUSTOMER';
    email: string;
    employeeId?: number;
    customerId?: number;
  };

  static fromResult(result: AuthResult): AuthResponseDto {
    return { accessToken: result.accessToken, user: result.user };
  }
}
