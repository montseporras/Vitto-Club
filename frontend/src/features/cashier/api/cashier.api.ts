import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { DocumentType } from '@/domain/documents'
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

export async function getCustomerPoints(customerId: number) {
  try {
    const res = await http.get<CustomerPoints>(`/customers/${customerId}/puntos`)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getCustomerMovements(customerId: number, limit: number, page = 1) {
  try {
    const res = await http.get<Paginated<PointsMovement>>(
      `/customers/${customerId}/movimientos`,
      { params: { limit, page } },
    )
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function adjustPoints(customerId: number, body: PointsAdjustmentBody) {
  try {
    const res = await http.post<PointsAdjustmentResult>(
      `/customers/${customerId}/ajustes-de-puntos`,
      body,
    )
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getConsumptionPreview(customerId: number, amount: number) {
  try {
    const res = await http.get<ConsumptionPreview>('/consumos/preview', {
      params: { customerId, amount },
    })
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function createConsumption(body: CreateConsumptionBody) {
  try {
    const res = await http.post<CreateConsumptionResult>('/consumos', body)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}
