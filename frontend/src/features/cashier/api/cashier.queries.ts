import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DocumentType } from '@/domain/documents'
import type { ApiError } from '@/shared/api/ApiError'
import type {
  Customer,
  CreateCustomerBody,
  UpdateCustomerBody,
} from '../types/customer'
import {
  activateCustomer,
  createCustomer,
  findCustomerByDocument,
  updateCustomer,
} from './cashier.api'

export const useCreateCustomer = () =>
  useMutation<Customer, ApiError, CreateCustomerBody>({
    mutationFn: createCustomer,
  })

export type DocumentSearch = {
  documentType: DocumentType
  documentNumber: string
}

const customerByDocumentKey = ({ documentType, documentNumber }: DocumentSearch) =>
  ['customers', 'by-document', documentType, documentNumber] as const

/** Busca al cliente por documento. No pide nada hasta que haya una búsqueda. */
export const useCustomerByDocument = (search: DocumentSearch | null) =>
  useQuery<Customer, ApiError>({
    queryKey: search ? customerByDocumentKey(search) : ['customers', 'by-document'],
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
      queryClient.removeQueries({ queryKey: ['customers', 'by-document'] })
      queryClient.setQueryData(customerByDocumentKey(customer), customer)
    },
  })
}

/** La reactivación no devuelve body: se arma el cliente actualizado a mano. */
export const useActivateCustomer = () => {
  const queryClient = useQueryClient()
  return useMutation<Customer, ApiError, Customer>({
    mutationFn: async (customer) => {
      await activateCustomer(customer.id)
      return { ...customer, active: true, deactivatedAt: null }
    },
    onSuccess: (customer) => {
      queryClient.setQueryData(customerByDocumentKey(customer), customer)
    },
  })
}
