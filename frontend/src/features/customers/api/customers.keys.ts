import type { CustomerListFilters } from '../types/customers'

/** Claves de TanStack Query de Clientes del Administrador. */
export const customersKeys = {
  lists: ['customers', 'list'] as const,
  list: (filters: CustomerListFilters) => ['customers', 'list', filters] as const,
  detail: (id: number) => ['customers', id, 'detail'] as const,
  consumptions: (id: number, limit: number) =>
    ['customers', id, 'consumptions', { limit }] as const,
}
