// Hooks de TanStack Query para recompensas.
import { useQuery } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import type { Reward } from '../types/reward'
import { getAvailableRewards } from './rewards.api'
import { rewardsKeys } from './rewards.keys'

// Recompensas disponibles del mostrador (§3.5.2). Se piden de nuevo cada vez que se abre el panel.
export const useAvailableRewards = (enabled = true) =>
  useQuery<Reward[], ApiError>({
    queryKey: rewardsKeys.available(),
    queryFn: getAvailableRewards,
    enabled,
    staleTime: 0,
  })
