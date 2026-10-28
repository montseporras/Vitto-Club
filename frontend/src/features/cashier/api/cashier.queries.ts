import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type {
  Customer,
  CreateCustomerBody,
  UpdateCustomerBody,
} from '../types/customer'
import type { Paginated } from '@/shared/types/pagination'
import type {
  CustomerPoints,
  PointsAdjustmentBody,
  PointsAdjustmentResult,
  PointsMovement,
} from '../types/points'
import type {
  ConsumptionPreview,
  CreateConsumptionBody,
  CreateConsumptionResult,
} from '../types/consumption'
import {
  adjustPoints,
  createConsumption,
  createCustomer,
  getConsumptionPreview,
  findCustomerByDocument,
  getCustomerMovements,
  getCustomerPoints,
  updateCustomer,
} from './cashier.api'
import { cashierKeys, type DocumentSearch } from './cashier.keys'

export type { DocumentSearch } from './cashier.keys'

export const useCreateCustomer = () =>
  useMutation<Customer, ApiError, CreateCustomerBody>({
    mutationFn: createCustomer,
  })

/** Busca al cliente por documento. No pide nada hasta que haya una búsqueda. */
export const useCustomerByDocument = (search: DocumentSearch | null) =>
  useQuery<Customer, ApiError>({
    queryKey: search ? cashierKeys.byDocument(search) : cashierKeys.byDocumentAll,
    queryFn: () =>
      findCustomerByDocument(search!.documentType, search!.documentNumber),
    enabled: search !== null,
    // Un 404 es una respuesta válida ("no existe"): no tiene sentido reintentar
    retry: (count, error) => error.status === undefined && count < 1,
  })

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient()
  return useMutation<Customer, ApiError, { id: number; body: UpdateCustomerBody }>({
    mutationFn: ({ id, body }) => updateCustomer(id, body),
    onSuccess: (customer) => {
      // Si cambió el documento, la búsqueda vieja ya no aplica
      queryClient.removeQueries({ queryKey: cashierKeys.byDocumentAll })
      queryClient.setQueryData(cashierKeys.byDocument(customer), customer)
    },
  })
}

/** Saldo y nivel del cliente (US-46). No pide nada hasta tener el id. */
export const useCustomerPoints = (customerId: number | null) =>
  useQuery<CustomerPoints, ApiError>({
    queryKey: cashierKeys.points(customerId ?? 0),
    queryFn: () => getCustomerPoints(customerId!),
    enabled: customerId !== null,
    retry: (count, error) => error.status === undefined && count < 1,
  })

/**
 * Últimos movimientos de puntos del cliente. Al Cajero el backend le fuerza las
 * últimas 24 h (contrato §3.6.1): la pantalla no filtra nada.
 */
export const useCustomerMovements = (
  customerId: number | null,
  limit: number,
  enabled: boolean,
  page = 1,
) =>
  useQuery<Paginated<PointsMovement>, ApiError>({
    queryKey: cashierKeys.movements(customerId ?? 0, limit, page),
    queryFn: () => getCustomerMovements(customerId!, limit, page),
    enabled: enabled && customerId !== null,
    retry: (count, error) => error.status === undefined && count < 1,
  })

/**
 * Ajusta los puntos de un cliente (US-24, solo el Administrador). Después se vuelve a pedir todo
 * lo del cliente (saldo, nivel, movimientos) y el listado de movimientos de puntos (US-26), así la
 * ficha muestra el saldo, la alerta y los movimientos nuevos (CA-24.9).
 */
export const useAdjustPoints = (customerId: number) => {
  const queryClient = useQueryClient()
  return useMutation<PointsAdjustmentResult, ApiError, PointsAdjustmentBody>({
    mutationFn: (body) => adjustPoints(customerId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cashierKeys.customer(customerId) })
      // Claves de features/points-movements: todas empiezan con 'points-movements'
      void queryClient.invalidateQueries({ queryKey: ['points-movements'] })
    },
  })
}

/**
 * Vista previa de puntos del consumo (US-21, CA-21.1): la calcula el backend.
 * No pide nada mientras el monto sea inválido (`amount` en null).
 */
export const useConsumptionPreview = (
  customerId: number | null,
  amount: number | null,
) =>
  useQuery<ConsumptionPreview, ApiError>({
    queryKey: cashierKeys.consumptionPreview(customerId ?? 0, amount ?? 0),
    queryFn: () => getConsumptionPreview(customerId!, amount!),
    enabled: customerId !== null && amount !== null,
    // Los 4xx son respuestas válidas (cliente de baja, sin equivalencia): no se reintentan
    retry: (count, error) => error.status === undefined && count < 1,
    // El saldo y la equivalencia pueden cambiar: no se reutiliza una vista previa vieja
    staleTime: 0,
    gcTime: 0,
  })

/** Registra el consumo (US-21). Después refresca saldo, nivel y movimientos del cliente. */
export const useCreateConsumption = () => {
  const queryClient = useQueryClient()
  return useMutation<CreateConsumptionResult, ApiError, CreateConsumptionBody>({
    mutationFn: createConsumption,
    onSuccess: (_result, body) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.points(body.customerId) })
      queryClient.invalidateQueries({
        queryKey: ['customers', body.customerId, 'movements'],
      })
      queryClient.invalidateQueries({
        queryKey: ['customers', body.customerId, 'consumptions'],
      })
    },
  })
}
