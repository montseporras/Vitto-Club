import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type {
  ConsumptionsPage,
  VoidConsumptionBody,
  VoidConsumptionResponse,
} from '../types/consumption'
import { cashierKeys } from './cashier.keys'
import { getCustomerConsumptions, voidConsumption } from './consumptions.api'
import { consumptionsKeys } from './consumptions.keys'

/** Consumos de las últimas 24 hs del cliente. */
export const useCustomerConsumptions = (customerId: number) =>
  useQuery<ConsumptionsPage, ApiError>({
    queryKey: consumptionsKeys.customerConsumptions(customerId),
    queryFn: () => getCustomerConsumptions(customerId),
  })

/**
 * Anula un consumo. La tabla se vuelve a pedir siempre (un 403 o un 409 significan
 * que lo que se veía ya no es cierto); el resto, solo si se anuló: si no, el modal
 * abierto recalcularía "saldo → saldo − puntos" sobre un saldo que ya no es el de antes.
 */
export const useVoidConsumption = (customerId: number) => {
  const queryClient = useQueryClient()
  return useMutation<
    VoidConsumptionResponse,
    ApiError,
    { code: string; body: VoidConsumptionBody }
  >({
    mutationFn: ({ code, body }) => voidConsumption(code, body),
    onSuccess: () => {
      // Todo lo del cliente (saldo, nivel, movimientos, consumos) y el listado de movimientos de
      // puntos (US-26), igual que "Ajustar puntos" (US-24)
      void queryClient.invalidateQueries({ queryKey: cashierKeys.customer(customerId) })
      void queryClient.invalidateQueries({ queryKey: ['points-movements'] })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: consumptionsKeys.customerConsumptions(customerId),
      })
    },
  })
}
