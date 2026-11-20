import type { MissionListFilters } from '../types/mission'

export const missionsKeys = {
  all: ['missions'] as const,
  lists: () => [...missionsKeys.all, 'list'] as const,
  list: (filters: MissionListFilters) => [...missionsKeys.lists(), filters] as const,
  details: () => [...missionsKeys.all, 'detail'] as const,
  detail: (id: number) => [...missionsKeys.details(), id] as const,
  completions: (id: number) => [...missionsKeys.all, 'completions', id] as const,
  customerMissions: (customerId: number, period?: string) =>
    [...missionsKeys.all, 'customer', customerId, period ?? 'current'] as const,
}
