import { cashierHandlers } from './cashier.handlers'
import { employeesHandlers } from './employees.handlers'

export const handlers = [...cashierHandlers, ...employeesHandlers]
