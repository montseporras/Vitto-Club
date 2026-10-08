import type { Role } from '@/domain/roles'

export const PATHS = {
  login: '/login',
  customer: {
    root: '/mi-cuenta',
  },
  cashier: {
    root: '/caja',
    customer: '/caja/cliente',
    redemption: '/caja/canje',
    newCustomer: '/caja/alta-cliente',
  },
  admin: {
    root: '/admin',
  },
} as const

/** Pantalla a la que va cada rol al entrar (o al abrir "/"). */
export const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: PATHS.customer.root,
  CASHIER: PATHS.cashier.root,
  ADMIN: PATHS.admin.root,
}
