// Un canje en el Historial (US-45, CA-45.3, contrato §3.12.1), con la misma forma que un consumo:
// una fila chica y, con la flecha, el detalle. Un Confirmado muestra "Ver código" (abre la ventana
// con el código en grande) y "Cancelar canje". Nunca se muestra qué empleado resolvió el canje.
import { useState } from 'react'
import {
  expiresInText,
  isExpiringSoon,
  splitDateTime,
  type MyRedemption,
} from '@/features/redemptions'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { clientStyles } from '@/styles/ui'
import { shortDate } from '../lib/client-format'
import { RedemptionStatusInline } from './client/RedemptionRow'
import { Button } from '@/shared/components/ui/Button'
import { isoToDisplayDateTime } from '@/shared/lib/dates'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'

type MyRedemptionItemProps = {
  redemption: MyRedemption
  now: number
  /** Abre la ventana "Cancelar canje" (US-43). */
  onCancel?: (redemption: MyRedemption) => void
  /** Abre la ventana con el código en grande */
  onShowCode?: (redemption: MyRedemption) => void
}

// Líneas del detalle de los canjes que ya no están Confirmados
function resolvedNotes(redemption: MyRedemption) {
  const { reward, resolvedAt } = redemption
  if (!resolvedAt) return []
  const { date, time } = splitDateTime(resolvedAt)
  switch (redemption.status) {
    case 'USED':
      return [`Usado el ${date} a las ${time}`, `Se descontaron ${formatInteger(reward.points)} pts`]
    case 'REJECTED':
      return [`Motivo: ${redemption.rejectionReason ?? '—'}`]
    case 'CANCELLED':
      return [`Cancelado el ${date} a las ${time}`]
    case 'EXPIRED':
      return [`Venció el ${date} a las ${time}`]
    default:
      return []
  }
}

export function MyRedemptionItem({ redemption, now, onCancel, onShowCode }: MyRedemptionItemProps) {
  const confirmed = redemption.status === 'CONFIRMED'
  const [open, setOpen] = useState(false)
  const detailId = `redemption-${redemption.id}-detail`

  return (
    <li className="even:bg-accent-50/60">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((current) => !current)}
        className={cn(clientStyles.rowLink, 'even:bg-transparent')}
      >
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700"
        >
          <Icon d={ICONS.ticket} className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn(clientStyles.rowTitle, 'block')}>{redemption.reward.name}</span>
          {/* Fecha y puntos a la izquierda, estado a la derecha: el nombre queda con todo el ancho */}
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={cn(clientStyles.rowMeta, 'whitespace-nowrap tabular-nums')}>
              {shortDate(redemption.createdAt)} · {formatInteger(redemption.reward.points)} pts
            </span>
            <RedemptionStatusInline status={redemption.status} />
          </span>
        </span>
        <Icon
          d={ICONS.chevronRight}
          className={cn(clientStyles.chevron, 'transition-transform duration-200', open && 'rotate-90')}
        />
      </button>

      {open && (
        <div id={detailId} className="grid gap-2 px-4 pb-4 pl-[4.75rem] text-sm">
          <p className="text-neutral-600">Pedido el {isoToDisplayDateTime(redemption.createdAt)}</p>
          {confirmed ? (
            <>
              <p>
                Código <strong className="tracking-wider text-accent-800">{redemption.code}</strong>
                {' · '}
                <span className={cn('font-semibold', isExpiringSoon(redemption.expiresAt, now) ? 'text-red-700' : 'text-olive-800')}>
                  {expiresInText(redemption.expiresAt, now).toLowerCase()}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => onShowCode?.(redemption)}>
                  Ver código
                </Button>
                {redemption.canCancel && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => onCancel?.(redemption)}>
                    Cancelar canje
                  </Button>
                )}
              </div>
            </>
          ) : (
            resolvedNotes(redemption).map((note) => <p key={note}>{note}</p>)
          )}
        </div>
      )}
    </li>
  )
}
