// Hooks para consultar y confirmar canjes con carga, error y caché (US-45 y US-40).
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rewardsKeys } from '@/features/rewards'
import type { ApiError } from '@/shared/api/ApiError'
import type {
  ConfirmedRedemption,
  MyRedemption,
  MyRedemptionFilters,
  Paginated,
  Redemption,
  RedemptionFilters,
} from '../types/redemption'
import {
  confirmCustomerRedemption,
  confirmMyRedemption,
  getCustomerRedemptions,
  getMyRedemptions,
  listRedemptions,
} from './redemptions.api'
import { redemptionsKeys } from './redemptions.keys'

// Mis canjes del Cliente (§3.12.1). `enabled` deja de pedir cuando el filtro de fechas está
// invertido: la pantalla no llama al backend (CA-45.1).
export const useMyRedemptions = (filters: MyRedemptionFilters, enabled = true) =>
  useQuery<Paginated<MyRedemption>, ApiError>({
    queryKey: redemptionsKeys.mine(filters),
    queryFn: () => getMyRedemptions(filters),
    enabled,
    placeholderData: keepPreviousData,
  })

// Canjes para usar ahora de un cliente (§3.12.2). El panel se actualiza cada vez que se abre.
export const useCustomerRedemptions = (customerId: number, enabled = true) =>
  useQuery<Redemption[], ApiError>({
    queryKey: redemptionsKeys.ofCustomer(customerId),
    queryFn: () => getCustomerRedemptions(customerId),
    enabled,
    staleTime: 0,
  })

// Pantalla Canjes del Administrador (§3.12.3): una página con los filtros ya aplicados.
export const useRedemptions = (filters: RedemptionFilters, page: number) =>
  useQuery<Paginated<Redemption>, ApiError>({
    queryKey: redemptionsKeys.list(filters, page),
    queryFn: () => listRedemptions(filters, page),
    placeholderData: keepPreviousData,
  })

// Después de confirmar, los listados de canjes se vuelven a pedir. Confirmar no toca el saldo ni
// el stock (§3.7.1), así que no se invalida nada de puntos. Si la recompensa ya no estaba
// disponible, se refrescan las recompensas (catálogo y mostrador).
function useConfirmationEffects() {
  const queryClient = useQueryClient()
  return {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: redemptionsKeys.all }),
    onError: (error: ApiError) => {
      if (error.code === 'REWARD_NOT_AVAILABLE') {
        void queryClient.invalidateQueries({ queryKey: rewardsKeys.all })
      }
    },
  }
}

// Confirmar canje desde la app (US-40, §3.7.1)
export const useConfirmMyRedemption = () =>
  useMutation<ConfirmedRedemption, ApiError, number>({
    mutationFn: confirmMyRedemption,
    ...useConfirmationEffects(),
  })

// Confirmar canje desde la caja, en nombre del cliente (US-40, §3.7.1)
export const useConfirmCustomerRedemption = (customerId: number) =>
  useMutation<ConfirmedRedemption, ApiError, number>({
    mutationFn: (rewardId) => confirmCustomerRedemption(customerId, rewardId),
    ...useConfirmationEffects(),
  })
