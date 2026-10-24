import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type {
  CustomerPointsMovement,
  PointsMovement,
  PointsMovementFilters,
  PointsMovementPage,
} from '../types/points-movement'

export async function getPointsMovements(
  filters: PointsMovementFilters,
  page: number,
) {
  try {
    const { data } = await http.get<PointsMovementPage<PointsMovement>>(
      '/movimientos-de-puntos',
      { params: { ...filters, page, limit: 10 } },
    )
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getCustomerPointsMovements(
  customerId: number,
  page = 1,
  limit = 5,
) {
  try {
    const { data } = await http.get<PointsMovementPage<PointsMovement>>(
      `/customers/${customerId}/movimientos`,
      { params: { page, limit } },
    )
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getMyPointsMovements(page: number, limit: number) {
  try {
    const { data } = await http.get<
      PointsMovementPage<CustomerPointsMovement>
    >('/customers/me/movimientos', { params: { page, limit } })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
