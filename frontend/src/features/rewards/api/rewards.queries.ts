// Hooks de TanStack Query para recompensas: mostrador (US-40) y catálogo del Cliente (US-39).
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type { Paginated } from '@/shared/types/pagination'
import type {
  AdminReward,
  CatalogFilter,
  CreateRewardBody,
  CustomerCatalog,
  Reward,
  RewardListFilters,
} from '../types/reward'
import { createReward, getAvailableRewards, getMyCatalog, listAdminRewards } from './rewards.api'
import { rewardsKeys } from './rewards.keys'

/** Listado de recompensas del Administrador. */
export const useAdminRewards = (filters: RewardListFilters) =>
  useQuery<Paginated<AdminReward>, ApiError>({
    queryKey: rewardsKeys.adminList(filters),
    queryFn: () => listAdminRewards(filters),
    placeholderData: keepPreviousData,
    retry: retryNetworkOnce,
  })

/** Alta de recompensa; al guardar se refrescan las variantes del listado del Administrador. */
export const useCreateReward = () => {
  const queryClient = useQueryClient()
  return useMutation<Reward, ApiError, CreateRewardBody>({
    mutationFn: createReward,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardsKeys.adminLists })
    },
  })
}

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

// Un 4xx es una respuesta válida: no tiene sentido reintentar
function retryNetworkOnce(count: number, error: ApiError) {
  return error.status === undefined && count < 1
}
