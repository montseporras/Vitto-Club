import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { DocumentType } from '@/domain/documents'
import type {
  Customer,
  CreateCustomerBody,
  UpdateCustomerBody,
} from '../types/customer'

export async function createCustomer(body: CreateCustomerBody) {
  try {
    const res = await http.post<Customer>('/customers', body)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function findCustomerByDocument(
  documentType: DocumentType,
  documentNumber: string,
) {
  try {
    const res = await http.get<Customer>('/customers/by-document', {
      params: { documentType, documentNumber },
    })
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function updateCustomer(id: number, body: UpdateCustomerBody) {
  try {
    const res = await http.patch<Customer>(`/customers/${id}`, body)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

/** PATCH /customers/:id/activate: 204 sin body / 404 / 409 (ya activo). */
export async function activateCustomer(id: number) {
  try {
    await http.patch(`/customers/${id}/activate`)
  } catch (error) {
    throw toApiError(error)
  }
}
