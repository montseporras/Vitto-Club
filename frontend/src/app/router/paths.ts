import type { Role } from '@/domain/roles'

export const PATHS = {
  login: '/login',
  register: '/registro',
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
    // Menú del Administrador (prototipo v2, en el orden del menú)
    rewards: '/admin/recompensas',
    missions: '/admin/misiones',
    customers: '/admin/clientes',
    customerDetail: '/admin/clientes/:id',
    statistics: '/admin/estadisticas',
    audit: '/admin/auditoria',
    identifyCustomer: '/admin/buscar-cliente',
    consumptions: '/admin/consumos',
    pointsMovements: '/admin/movimientos',
  },
} as const

/** Pantalla a la que va cada rol al entrar (o al abrir "/"). */
export const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: PATHS.customer.root,
  CASHIER: PATHS.cashier.root,
  ADMIN: PATHS.admin.root,
}
