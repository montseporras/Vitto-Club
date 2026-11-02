import { Badge, type BadgeProps } from '@/shared/components/ui/Badge'
import { REDEMPTION_STATUSES } from '../lib/format'
import type { RedemptionStatus } from '../types/redemption'

const VARIANTS: Record<RedemptionStatus, NonNullable<BadgeProps['variant']>> = {
  CONFIRMED: 'accent',
  USED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
}

/** Badge con el estado del canje. */
export function RedemptionStatusBadge({ status }: { status: RedemptionStatus }) {
  return <Badge variant={VARIANTS[status]}>{REDEMPTION_STATUSES[status]}</Badge>
}
