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

/** Estado del canje con su ícono (el color nunca va solo). */
export function RedemptionStatusInline({ status }: { status: MyRedemption['status'] }) {
  const look = STATUS_LOOK[status]
  return (
    <span className={cn('flex shrink-0 items-center gap-1 text-xs font-bold', look.className)}>
      <Icon d={look.icon} className="size-4" />
      {REDEMPTION_STATUSES[status]}
    </span>
  )
}

/**
 * Canje en la lista de "Mis canjes". Los Confirmados se pueden tocar: abren la ventana con el
 * código en grande para mostrarlo en la caja.
 */
export function RedemptionRow({
  redemption,
  photoUrl,
  onShowCode,
}: {
  redemption: MyRedemption
  photoUrl: string | null
  onShowCode?: (redemption: MyRedemption) => void
}) {
  const confirmed = redemption.status === 'CONFIRMED'
  const content = (
    <>
      <RewardImage
        photoUrl={photoUrl}
        className="size-12 rounded-xl"
        genericClassName="bg-accent-100 text-accent-700"
        iconClassName="size-6"
      />
      <span className="min-w-0 flex-1">
        <span className={cn(clientStyles.rowTitle, 'block')}>{redemption.reward.name}</span>
        {/* Fecha a la izquierda y estado a la derecha: el nombre queda con todo el ancho */}
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn(clientStyles.rowMeta, 'whitespace-nowrap')}>{shortDate(redemption.createdAt)}</span>
          <RedemptionStatusInline status={redemption.status} />
        </span>
        {confirmed && onShowCode && (
          <span className="mt-0.5 block text-xs font-semibold text-accent-700">Tocá para ver el código</span>
        )}
      </span>
      {confirmed && onShowCode && <Icon d={ICONS.chevronRight} className={clientStyles.chevron} />}
    </>
  )

  return (
    <li className="even:bg-accent-50/60">
      {confirmed && onShowCode ? (
        <button
          type="button"
          onClick={() => onShowCode(redemption)}
          aria-label={`Ver el código del canje de ${redemption.reward.name}`}
          className={cn(clientStyles.rowLink, 'even:bg-transparent')}
        >
          {content}
        </button>
      ) : (
        <div className={cn(clientStyles.row, 'even:bg-transparent')}>{content}</div>
      )}
    </li>
  )
}
