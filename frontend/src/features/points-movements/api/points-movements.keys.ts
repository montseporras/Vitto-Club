import type { PointsMovementFilters } from '../types/points-movement'

export const pointsMovementsKeys = {
  all: ['points-movements'] as const,
  admin: (filters: PointsMovementFilters, page: number) =>
    [...pointsMovementsKeys.all, 'admin', filters, page] as const,
  customer: (customerId: number, page: number, limit: number) =>
    [...pointsMovementsKeys.all, 'customer', customerId, page, limit] as const,
  me: (page: number, limit: number) =>
    [...pointsMovementsKeys.all, 'me', page, limit] as const,
}
