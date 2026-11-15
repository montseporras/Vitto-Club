import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { Paginated } from '@/shared/types/pagination'
import type {
  CompletedMission,
  CreateMissionBody,
  Mission,
  MissionListFilters,
} from '../types/mission'

export const MISSIONS_PAGE_SIZE = 10

export async function listMissions(
  filters: MissionListFilters,
): Promise<Paginated<Mission>> {
  try {
    const { data } = await http.get<Paginated<Mission>>('/misiones', {
      params: {
        q: filters.q || undefined,
        phase: filters.phase || undefined,
        order: filters.order,
        page: filters.page,
        limit: filters.limit ?? MISSIONS_PAGE_SIZE,
      },
    })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getMission(id: number): Promise<Mission> {
  try {
    const { data } = await http.get<Mission>(`/misiones/${id}`)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getCompletedMissions(id: number): Promise<CompletedMission[]> {
  try {
    const { data } = await http.get<CompletedMission[]>(`/misiones/${id}/completadas`)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function createMission(body: CreateMissionBody): Promise<Mission> {
  try {
    const { data } = await http.post<Mission>('/misiones', body)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
