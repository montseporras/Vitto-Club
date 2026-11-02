// Etiqueta de vencimiento de una recompensa (contrato §3.1): la arma el frontend con `status`,
// `disabledReason` y `daysToExpire`.
import type { Reward } from '../types/reward'

export type RewardExpiryLabel = {
  text: string
  /** Contorno (Agotada, Vencida), neutro o destacado (vence pronto) */
  style: 'outline' | 'neutral' | 'highlight'
}

export function rewardExpiryLabel(
  reward: Pick<Reward, 'status' | 'disabledReason' | 'daysToExpire'>,
): RewardExpiryLabel {
  if (reward.status === 'DISABLED') {
    return {
      text: reward.disabledReason === 'OUT_OF_STOCK' ? 'Agotada' : 'Vencida',
      style: 'outline',
    }
  }
  const days = reward.daysToExpire
  if (days === null) return { text: 'No vence', style: 'neutral' }
  if (days === 0) return { text: 'Vence hoy', style: 'highlight' }
  return { text: `Vence en ${days} d`, style: days <= 5 ? 'highlight' : 'neutral' }
}
