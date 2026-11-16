// Canje en la lista de "Mis canjes" (diseño V2): foto de la recompensa, nombre, fecha y estado.
import { REDEMPTION_STATUSES, type MyRedemption } from '@/features/redemptions'
import { RewardImage } from '@/features/rewards'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { shortDate } from '../../lib/client-format'

// Ícono y color de cada estado: el color nunca va solo, siempre con el texto
const STATUS_LOOK: Record<MyRedemption['status'], { icon: string; className: string }> = {
  CONFIRMED: { icon: ICONS.ticket, className: 'text-accent-700' },
  USED: { icon: ICONS.checkCircle, className: 'text-olive-800' },
  REJECTED: { icon: ICONS.xCircle, className: 'text-negative' },
  CANCELLED: { icon: ICONS.xCircle, className: 'text-neutral-600' },
  EXPIRED: { icon: ICONS.clock, className: 'text-neutral-600' },
}

export function RedemptionRow({ redemption, photoUrl }: { redemption: MyRedemption; photoUrl: string | null }) {
  const look = STATUS_LOOK[redemption.status]
  return (
    <li className={clientStyles.row}>
      <RewardImage
        photoUrl={photoUrl}
        className="size-12 rounded-xl"
        genericClassName="bg-accent-100 text-accent-700"
        iconClassName="size-6"
      />
      <div className="min-w-0 flex-1">
        <p className={clientStyles.rowTitle}>{redemption.reward.name}</p>
        <p className={clientStyles.rowMeta}>
          {shortDate(redemption.createdAt)}
          {redemption.status === 'CONFIRMED' && (
            <>
              {' · '}
              <span className="font-bold tracking-wider text-accent-800">{redemption.code}</span>
            </>
          )}
        </p>
      </div>
      <span className={cn('flex shrink-0 items-center gap-1.5 text-sm font-semibold', look.className)}>
        <Icon d={look.icon} className="size-5" />
        {REDEMPTION_STATUSES[redemption.status]}
      </span>
    </li>
  )
}
