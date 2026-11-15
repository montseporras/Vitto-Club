import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type { Paginated } from '@/shared/types/pagination'
import type {
  CompletedMission,
  CreateMissionBody,
  Mission,
  MissionListFilters,
} from '../types/mission'
import {
  createMission,
  getCompletedMissions,
  getMission,
  listMissions,
} from './missions.api'
import { missionsKeys } from './missions.keys'

function retryNetworkOnce(count: number, error: ApiError) {
  return error.status === undefined && count < 1
}

export const useMissions = (filters: MissionListFilters) =>
  useQuery<Paginated<Mission>, ApiError>({
    queryKey: missionsKeys.list(filters),
    queryFn: () => listMissions(filters),
    placeholderData: keepPreviousData,
    retry: retryNetworkOnce,
  })

export const useMission = (id: number | null) =>
  useQuery<Mission, ApiError>({
    queryKey: id === null ? [...missionsKeys.details(), 'none'] : missionsKeys.detail(id),
    queryFn: () => {
      if (id === null) throw new Error('El identificador de misión es obligatorio.')
      return getMission(id)
    },
    enabled: id !== null,
    retry: retryNetworkOnce,
  })

export const useMissionCompletions = (id: number | null) =>
  useQuery<CompletedMission[], ApiError>({
    queryKey:
      id === null ? [...missionsKeys.all, 'completions', 'none'] : missionsKeys.completions(id),
    queryFn: () => {
      if (id === null) throw new Error('El identificador de misión es obligatorio.')
      return getCompletedMissions(id)
    },
    enabled: id !== null,
    retry: retryNetworkOnce,
  })

export const useCreateMission = () => {
  const queryClient = useQueryClient()
  return useMutation<Mission, ApiError, CreateMissionBody>({
    mutationFn: createMission,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: missionsKeys.lists() })
    },
  })
}
