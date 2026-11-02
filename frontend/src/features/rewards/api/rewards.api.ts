// Llamadas al backend de recompensas. Las usan los hooks de rewards.queries.ts.
import { toApiError } from '@/shared/api/ApiError'
import { http } from '@/shared/api/http'
import type { Reward } from '../types/reward'

// Recompensas disponibles para el mostrador, por puntos ascendentes (§3.5.2)
export async function getAvailableRewards(): Promise<Reward[]> {
  try {
    const { data } = await http.get<Reward[]>('/recompensas/disponibles')
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
