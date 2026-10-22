import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type { CustomerPoints } from '../types/customer-points'
import type {
  ConsumptionsPage,
  VoidConsumptionBody,
  VoidConsumptionResponse,
} from '../types/consumption'
import {
  getCustomerConsumptions,
  getCustomerPoints,
  voidConsumption,
} from './consumptions.api'
import { consumptionsKeys } from './consumptions.keys'

/** Consumos de las últimas 24 hs del cliente. */
export const useCustomerConsumptions = (customerId: number) =>
  useQuery<ConsumptionsPage, ApiError>({
    queryKey: consumptionsKeys.customerConsumptions(customerId),
    queryFn: () => getCustomerConsumptions(customerId),
  })

/** Saldo y nivel del cliente. */
export const useCustomerPoints = (customerId: number) =>
  useQuery<CustomerPoints, ApiError>({
    queryKey: consumptionsKeys.customerPoints(customerId),
    queryFn: () => getCustomerPoints(customerId),
  })

/**
 * Anula un consumo. La tabla se vuelve a pedir siempre (un 403 o un 409 significan
 * que lo que se veía ya no es cierto); el saldo, solo si se anuló: si no, el modal
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
      void queryClient.invalidateQueries({
        queryKey: consumptionsKeys.customerPoints(customerId),
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: consumptionsKeys.customerConsumptions(customerId),
      })
    },
  })
}
