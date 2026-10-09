// Este archivo junta los mocks de todos los features en una sola lista.
// Es lo que lee mocks/browser.ts para saber qué llamadas simular.
import { cashierHandlers } from './cashier.handlers'
import { employeesHandlers } from './employees.handlers'
import { pointsHandlers } from './points.handlers'

export const handlers = [
  ...cashierHandlers,
  ...employeesHandlers,
  ...pointsHandlers,
]