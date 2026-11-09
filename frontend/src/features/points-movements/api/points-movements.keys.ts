export const pointsMovementsKeys = {
  all: ['points-movements'] as const,
  customer: (customerId: number, page: number, limit: number) =>
    [...pointsMovementsKeys.all, 'customer', customerId, page, limit] as const,
  me: (page: number, limit: number) =>
    [...pointsMovementsKeys.all, 'me', page, limit] as const,
}
