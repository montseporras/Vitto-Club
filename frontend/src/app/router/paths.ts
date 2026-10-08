export const PATHS = {
  auth: {
    login: '/login',
    register: '/registro',
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
