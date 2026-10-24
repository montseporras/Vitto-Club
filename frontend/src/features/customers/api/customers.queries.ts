import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type { Paginated } from '@/shared/types/pagination'
import type { Customer } from '@/features/cashier'
import type {
  Consumption,
  CustomerListFilters,
  CustomerListItem,
  UpdateCustomerAdminBody,
} from '../types/customers'
import {
  deactivateCustomer,
  getCustomer,
  getCustomerConsumptions,
  listCustomers,
  updateCustomer,
} from './customers.api'
import { customersKeys } from './customers.keys'

// Un 4xx es una respuesta válida: no tiene sentido reintentar
const retryNetworkOnce = (count: number, error: ApiError) =>
  error.status === undefined && count < 1

/** Listado de Clientes. Mientras llega la página nueva, se sigue viendo la anterior. */
export const useCustomers = (filters: CustomerListFilters) =>
  useQuery<Paginated<CustomerListItem>, ApiError>({
    queryKey: customersKeys.list(filters),
    queryFn: () => listCustomers(filters),
    placeholderData: keepPreviousData,
    retry: retryNetworkOnce,
  })

export const useCustomer = (id: number) =>
  useQuery<Customer, ApiError>({
    queryKey: customersKeys.detail(id),
    queryFn: () => getCustomer(id),
    retry: retryNetworkOnce,
  })

export const useCustomerConsumptions = (id: number, limit: number) =>
  useQuery<Paginated<Consumption>, ApiError>({
    queryKey: customersKeys.consumptions(id, limit),
    queryFn: () => getCustomerConsumptions(id, limit),
    retry: retryNetworkOnce,
  })

export const useUpdateCustomerAdmin = () => {
  const queryClient = useQueryClient()
  return useMutation<Customer, ApiError, { id: number; body: UpdateCustomerAdminBody }>({
    mutationFn: ({ id, body }) => updateCustomer(id, body),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: customersKeys.lists })
      queryClient.setQueryData(customersKeys.detail(customer.id), customer)
    },
  })
}

export const useDeactivateCustomer = () => {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, number>({
    mutationFn: deactivateCustomer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customersKeys.lists })
    },
  })
}

/** Después de un alta, el listado se vuelve a pedir. */
export const useRefreshCustomers = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: customersKeys.lists })
}
