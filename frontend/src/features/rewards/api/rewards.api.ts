// Llamadas al backend de recompensas: las del mostrador (US-40) y el catálogo del Cliente (US-39).
// Las usan los hooks de rewards.queries.ts.
import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { Paginated } from '@/shared/types/pagination'
import type { CatalogFilter, CustomerCatalog, Reward } from '../types/reward'
import type { AdminReward, CreateRewardBody, RewardListFilters } from '../types/reward'

export const REWARDS_PAGE_SIZE = 10

/** Recompensas del Administrador (§3.2.1). */
export async function listAdminRewards({
  q,
  status,
  page,
}: RewardListFilters): Promise<Paginated<AdminReward>> {
  try {
    const { data } = await http.get<Paginated<AdminReward>>('/recompensas', {
      params: {
        q: q || undefined,
        status: status || undefined,
        page,
        limit: REWARDS_PAGE_SIZE,
      },
    })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/** Alta de una recompensa (§3.2.3). */
export async function createReward(body: CreateRewardBody): Promise<Reward> {
  try {
    const { data } = await http.post<Reward>('/recompensas', body)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

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
