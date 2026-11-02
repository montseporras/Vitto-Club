import { Badge } from '@/shared/components/ui/Badge'
import { cn } from '@/shared/lib/utils'
import { rewardExpiryLabel } from '../lib/expiry-label'
import type { Reward } from '../types/reward'

const STYLES = {
  outline: 'bg-transparent border-accent-400 text-accent-800',
  neutral: undefined,
  highlight: undefined,
} as const

/** Etiqueta de vencimiento de la recompensa (§3.1). */
export function RewardExpiryTag({
  reward,
}: {
  reward: Pick<Reward, 'status' | 'disabledReason' | 'daysToExpire'>
}) {
  const label = rewardExpiryLabel(reward)
  return (
    <Badge
      variant={label.style === 'highlight' ? 'accent' : 'neutral'}
      className={cn(STYLES[label.style])}
    >
      {label.text}
    </Badge>
  )
}
