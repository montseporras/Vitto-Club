import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { Paginated } from '@/shared/types/pagination'
import type { Customer } from '@/features/cashier'
import type {
  Consumption,
  CustomerListFilters,
  CustomerListItem,
  UpdateCustomerAdminBody,
} from '../types/customers'

/** Clientes por página (contrato §3.8.1). */
export const CUSTOMERS_PAGE_SIZE = 20

export async function listCustomers({
  documentType,
  documentNumber,
  level,
  page,
}: CustomerListFilters) {
  try {
    const res = await http.get<Paginated<CustomerListItem>>('/customers', {
      params: {
        active: true,
        sort: 'lastName',
        // El tipo solo filtra si viene el número (Sprint 4, §3.13.4)
        documentType: documentNumber ? documentType : undefined,
        documentNumber: documentNumber || undefined,
        level: level || undefined,
        page,
        limit: CUSTOMERS_PAGE_SIZE,
      },
    })
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getCustomer(id: number) {
  try {
    const res = await http.get<Customer>(`/customers/${id}`)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function updateCustomer(id: number, body: UpdateCustomerAdminBody) {
  try {
    const res = await http.patch<Customer>(`/customers/${id}`, body)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

/** Baja lógica (§3.8.3): responde 204 sin cuerpo. */
export async function deactivateCustomer(id: number) {
  try {
    await http.patch(`/customers/${id}/deactivate`)
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getCustomerConsumptions(id: number, limit: number) {
  try {
    const res = await http.get<Paginated<Consumption>>(`/customers/${id}/consumos`, {
      params: { limit },
    })
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}
