// Este archivo junta los mocks de todos los features en una sola lista.
// Es lo que lee mocks/browser.ts para saber qué llamadas simular.
import { authHandlers } from './auth.handlers'
import { auditHandlers } from './audit.handlers'
import { cashierHandlers } from './cashier.handlers'
import { consumptionsHandlers } from './consumptions.handlers'
import { employeesHandlers } from './employees.handlers'
import { myAccountHandlers } from './my-account.handlers'
import { pointsHandlers } from './points.handlers'
import { pointsMovementsHandlers } from './points-movements.handlers'

export const handlers = [
  ...authHandlers,
  // Antes que los de caja: /customers/me tiene que ganarle a /customers/:id
  ...myAccountHandlers,
  // También antes que los de caja: /customers/me/movimientos le tiene que ganar a
  // /customers/:id/movimientos
  ...pointsMovementsHandlers,
  // También antes que los de caja: /customers/me/consumos le tiene que ganar a
  // /customers/:id/consumos
  ...consumptionsHandlers,
  ...auditHandlers,
  ...cashierHandlers,
  ...employeesHandlers,
  ...pointsHandlers,
]
