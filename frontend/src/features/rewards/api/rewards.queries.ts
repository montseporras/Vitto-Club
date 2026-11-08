// Hooks de TanStack Query para Administración, mostrador y catálogo del Cliente.
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
  UpdateRewardBody,
  UpdateRewardResponse,
} from '../types/reward'
import {
  createReward,
  getAdminReward,
  getAvailableRewards,
  getMyCatalog,
  listAdminRewards,
  updateReward,
} from './rewards.api'
import { rewardsKeys } from './rewards.keys'

/** Listado de recompensas del Administrador. */
export const useAdminRewards = (filters: RewardListFilters) =>
  useQuery<Paginated<AdminReward>, ApiError>({
    queryKey: rewardsKeys.adminList(filters),
    queryFn: () => listAdminRewards(filters),
    placeholderData: keepPreviousData,
    retry: retryNetworkOnce,
  })

/** Detalle de una recompensa del Administrador. */
export const useAdminReward = (id: number | undefined) =>
  useQuery<Reward, ApiError>({
    queryKey:
      id === undefined
        ? [...rewardsKeys.adminLists, 'detail', 'none']
        : rewardsKeys.adminDetail(id),
    queryFn: () => {
      if (id === undefined) throw new Error('El identificador de recompensa es obligatorio.')
      return getAdminReward(id)
    },
    enabled: id !== undefined,
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

/** Edición de recompensa; refresca todas las vistas que muestran su disponibilidad o datos. */
export const useUpdateReward = () => {
  const queryClient = useQueryClient()
  return useMutation<
    UpdateRewardResponse,
    ApiError,
    { id: number; body: UpdateRewardBody }
  >({
    mutationFn: ({ id, body }) => updateReward(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardsKeys.all })
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
