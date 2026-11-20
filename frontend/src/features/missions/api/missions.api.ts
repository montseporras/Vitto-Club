import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { Paginated } from '@/shared/types/pagination'
import type {
  CompletedMission,
  CreateMissionBody,
  DeleteMissionResponse,
  Mission,
  MissionListFilters,
  MyCustomerMission,
  StaffCustomerMission,
  UpdateMissionBody,
  UpdateMissionResponse,
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

export async function updateMission(
  id: number,
  body: UpdateMissionBody,
): Promise<UpdateMissionResponse> {
  try {
    const { data } = await http.patch<UpdateMissionResponse>(`/misiones/${id}`, body)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getMyMissions(period?: string): Promise<MyCustomerMission[]> {
  try {
    const { data } = await http.get<MyCustomerMission[]>('/customers/me/misiones', {
      params: period ? { period } : undefined,
    })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function deleteMission(id: number): Promise<DeleteMissionResponse> {
  try {
    const { data } = await http.patch<DeleteMissionResponse>(`/misiones/${id}/eliminar`)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getCustomerMissions(
  customerId: number,
  period?: string,
): Promise<StaffCustomerMission[]> {
  try {
    const { data } = await http.get<StaffCustomerMission[]>(
      `/customers/${customerId}/misiones`,
      { params: period ? { period } : undefined },
    )
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
