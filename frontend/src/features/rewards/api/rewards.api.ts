// Llamadas al backend de recompensas: las del mostrador (US-40) y el catálogo del Cliente (US-39).
// Las usan los hooks de rewards.queries.ts.
import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { CatalogFilter, CustomerCatalog, Reward } from '../types/reward'

// Recompensas disponibles para el mostrador, por puntos ascendentes (§3.5.2)
export async function getAvailableRewards(): Promise<Reward[]> {
  try {
    const { data } = await http.get<Reward[]>('/recompensas/disponibles')
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

// Catálogo del Cliente (§3.5.1): el cliente sale del token. Trae el saldo para no hacer dos pedidos.
export async function getMyCatalog(filter: CatalogFilter): Promise<CustomerCatalog> {
  try {
    const { data } = await http.get<CustomerCatalog>('/customers/me/recompensas', {
      params: { filter },
    })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
