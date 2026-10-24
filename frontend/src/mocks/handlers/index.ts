// Este archivo junta los mocks de todos los features en una sola lista.
// Es lo que lee mocks/browser.ts para saber qué llamadas simular.
import { authHandlers } from './auth.handlers'
import { cashierHandlers } from './cashier.handlers'
import { employeesHandlers } from './employees.handlers'
import { myAccountHandlers } from './my-account.handlers'
import { pointsHandlers } from './points.handlers'

export const handlers = [
  ...authHandlers,
  // Antes que los de caja: /customers/me tiene que ganarle a /customers/:id
  ...myAccountHandlers,
  ...cashierHandlers,
  ...employeesHandlers,
  ...pointsHandlers,
]
