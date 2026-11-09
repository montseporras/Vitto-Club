import { useQuery } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type {
  CustomerPointsMovement,
  PointsMovement,
  PointsMovementPage,
} from '../types/points-movement'
import {
  getCustomerPointsMovements,
  getMyPointsMovements,
} from './points-movements.api'
import { pointsMovementsKeys } from './points-movements.keys'

export const useCustomerPointsMovements = (
  customerId: number,
  page = 1,
  limit = 5,
) =>
  useQuery<PointsMovementPage<PointsMovement>, ApiError>({
    queryKey: pointsMovementsKeys.customer(customerId, page, limit),
    queryFn: () => getCustomerPointsMovements(customerId, page, limit),
  })

export const useMyPointsMovements = (page: number, limit: number) =>
  useQuery<PointsMovementPage<CustomerPointsMovement>, ApiError>({
    queryKey: pointsMovementsKeys.me(page, limit),
    queryFn: () => getMyPointsMovements(page, limit),
  })
