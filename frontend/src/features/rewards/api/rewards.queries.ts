// Hooks de TanStack Query para recompensas: mostrador (US-40) y catálogo del Cliente (US-39).
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type { CatalogFilter, CustomerCatalog, Reward } from '../types/reward'
import { getAvailableRewards, getMyCatalog } from './rewards.api'
import { rewardsKeys } from './rewards.keys'

// Recompensas disponibles del mostrador (§3.5.2). Se piden de nuevo cada vez que se abre el panel.
export const useAvailableRewards = (enabled = true) =>
  useQuery<Reward[], ApiError>({
    queryKey: rewardsKeys.available(),
    queryFn: getAvailableRewards,
    enabled,
    staleTime: 0,
  })

// Catálogo del Cliente (§3.5.1). Al cambiar de filtro se mantiene la lista anterior hasta que llega
// la nueva, para que la pantalla no salte.
export const useMyCatalog = (filter: CatalogFilter) =>
  useQuery<CustomerCatalog, ApiError>({
    queryKey: rewardsKeys.catalog(filter),
    queryFn: () => getMyCatalog(filter),
    placeholderData: keepPreviousData,
  })
