import { authHandlers } from './auth.handlers'
import { cashierHandlers } from './cashier.handlers'
import { employeesHandlers } from './employees.handlers'

export const handlers = [
  ...authHandlers,
  ...cashierHandlers,
  ...employeesHandlers,
]
