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
  ActivateRewardResponse,
  AdminReward,
  CatalogFilter,
  CreateRewardBody,
  CustomerCatalog,
  DeleteRewardResponse,
  DeactivateRewardResponse,
  Reward,
  RewardListFilters,
  UpdateRewardBody,
  UpdateRewardResponse,
} from '../types/reward'
import {
  activateReward,
  createReward,
  deleteReward,
  deactivateReward,
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

/** Activación de recompensa; actualiza listados, catálogo y mostrador. */
export const useActivateReward = () => {
  const queryClient = useQueryClient()
  return useMutation<ActivateRewardResponse, ApiError, number>({
    mutationFn: activateReward,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardsKeys.all })
    },
  })
}

/** Desactivación de recompensa; actualiza listados, catálogo y mostrador. */
export const useDeactivateReward = () => {
  const queryClient = useQueryClient()
  return useMutation<DeactivateRewardResponse, ApiError, number>({
    mutationFn: deactivateReward,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardsKeys.all })
    },
  })
}

/** Baja lógica de recompensa; también refresca los canjes rechazados automáticamente. */
export const useDeleteReward = () => {
  const queryClient = useQueryClient()
  return useMutation<DeleteRewardResponse, ApiError, number>({
    mutationFn: deleteReward,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardsKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['redemptions'] })
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
