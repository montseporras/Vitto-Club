import type { Role } from '@/domain/roles'

/** Usuario de la sesión, tal como lo devuelven login y refresh (docs/auth-api.md). */
export type AuthUser = {
  accountId: number
  role: Role
  email: string
  employeeId?: number // presente para ADMIN y CASHIER
  customerId?: number // presente para CUSTOMER
  // Pedidos al backend para el encabezado ("Nombre Apellido · Rol"); mientras
  // no lleguen, se muestra el email.
  firstName?: string
  lastName?: string
}

export type AuthResponse = {
  accessToken: string
  user: AuthUser
}

export type LoginBody = {
  email: string
  password: string
}

/** Códigos de error de autenticación: las decisiones se toman por estos, nunca por el mensaje. */
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_SESSION: 'INVALID_SESSION',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
} as const
