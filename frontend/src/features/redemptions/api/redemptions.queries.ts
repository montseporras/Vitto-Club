// Hooks para consultar, confirmar, usar, rechazar y cancelar canjes con carga, error y caché
// (US-45, US-40, US-42 y US-43).
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rewardsKeys } from '@/features/rewards'
import type { ApiError } from '@/shared/api/ApiError'
import type {
  CancelRedemptionResult,
  ConfirmedRedemption,
  MyRedemption,
  MyRedemptionFilters,
  Paginated,
  Redemption,
  RegisterUseResult,
  RedemptionFilters,
  RejectRedemptionResult,
} from '../types/redemption'
import {
  cancelMyRedemption,
  confirmCustomerRedemption,
  confirmMyRedemption,
  getCustomerRedemptions,
  getMyRedemptions,
  getRedemptionByCode,
  listRedemptions,
  registerRedemptionUse,
  rejectRedemption,
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
export const useRedemptions = (filters: RedemptionFilters, page: number, limit: number) =>
  useQuery<Paginated<Redemption>, ApiError>({
    queryKey: redemptionsKeys.list(filters, page, limit),
    queryFn: () => listRedemptions(filters, page, limit),
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

// Registrar el uso (US-42, §3.9.1). Cambia el saldo, los movimientos y el stock del cliente, y el
// estado del canje: se vuelven a pedir los canjes, los movimientos y las recompensas. También con
// un error, porque el canje pudo cambiar de estado (por ejemplo, vencer). El saldo lo vuelve a
// pedir quien tiene la tarjeta del cliente a la vista (ver `onUsed` de RegisterUseModal): pedirlo
// desde acá haría que la pantalla de Caja esconda al cliente y cierre la ventana.
export const useRegisterRedemptionUse = (customerId: number) => {
  const queryClient = useQueryClient()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: redemptionsKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'movements'] })
    void queryClient.invalidateQueries({ queryKey: ['points-movements'] })
    void queryClient.invalidateQueries({ queryKey: rewardsKeys.all })
  }
  return useMutation<RegisterUseResult, ApiError, string>({
    mutationFn: registerRedemptionUse,
    onSuccess: refresh,
    onError: refresh,
  })
}

// Rechazar y cancelar solo cambian el estado del canje: no tocan saldo, movimientos ni stock
// (§3.10, sin reintegro). Se vuelven a pedir los canjes, también con un error, porque el canje pudo
// cambiar de estado (por ejemplo, vencer al leer o haberlo resuelto otro empleado).
function useRefreshRedemptions() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: redemptionsKeys.all })
}

type RejectVariables = { code: string; reason: string }

// Rechazar un canje con motivo (US-43, §3.10.1). Cajero y Administrador.
export const useRejectRedemption = () => {
  const refresh = useRefreshRedemptions()
  return useMutation<RejectRedemptionResult, ApiError, RejectVariables>({
    mutationFn: ({ code, reason }) => rejectRedemption(code, { reason }),
    onSuccess: refresh,
    onError: refresh,
  })
}

// El Cliente cancela un canje propio (US-43, §3.10.3).
export const useCancelMyRedemption = () => {
  const refresh = useRefreshRedemptions()
  return useMutation<CancelRedemptionResult, ApiError, string>({
    mutationFn: cancelMyRedemption,
    onSuccess: refresh,
    onError: refresh,
  })
}

// Canjes por código (US-41, §3.8.1). Sin código no pide nada. Siempre vuelve a pedir al buscar
// (staleTime 0, sin reintentos): el backend vence al leer y el 404 es una respuesta esperada.
export const useRedemptionByCode = (code: string | null) =>
  useQuery<Redemption, ApiError>({
    queryKey: redemptionsKeys.byCode(code ?? ''),
    queryFn: () => getRedemptionByCode(code as string),
    enabled: code !== null,
    staleTime: 0,
    retry: false,
  })
