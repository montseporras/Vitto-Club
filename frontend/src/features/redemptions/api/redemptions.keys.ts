// Nombres con los que se guardan en caché los canjes. Todos cuelgan de ['redemptions']: después
// de una acción (usar, rechazar, cancelar), invalidar esa clave refresca todos los listados.
import type { MyRedemptionFilters, RedemptionFilters } from '../types/redemption'

export const redemptionsKeys = {
  all: ['redemptions'] as const,
  mine: (filters: MyRedemptionFilters) => [...redemptionsKeys.all, 'me', filters] as const,
  ofCustomer: (customerId: number) =>
    [...redemptionsKeys.all, 'customer', customerId] as const,
  list: (filters: RedemptionFilters, page: number) =>
    [...redemptionsKeys.all, 'list', filters, page] as const,
}
