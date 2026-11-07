// Un canje en Mis canjes (US-45, CA-45.3, contrato §3.12.1). Los Confirmados se muestran abiertos,
// con el código grande. Nunca se muestra qué empleado resolvió el canje.
import { useState } from 'react'
import {
  expiresInText,
  isExpiringSoon,
  RedemptionStatusBadge,
  splitDateTime,
  type MyRedemption,
} from '@/features/redemptions'
import { Button } from '@/shared/components/ui/Button'
import { isoToDisplayDateTime } from '@/shared/lib/dates'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'

type MyRedemptionItemProps = {
  redemption: MyRedemption
  now: number
  /** Abre la ventana "Cancelar canje" (US-43). */
  onCancel?: (redemption: MyRedemption) => void
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

export function MyRedemptionItem({ redemption, now, onCancel }: MyRedemptionItemProps) {
  const confirmed = redemption.status === 'CONFIRMED'
  // Hasta que el Cliente lo toque, los Confirmados están abiertos y el resto cerrado
  const [toggled, setToggled] = useState<boolean | null>(null)
  const open = toggled ?? confirmed
  const detailId = `redemption-${redemption.id}-detail`

  return (
    <li
      className={cn(
        'grid gap-1 rounded-2xl border-2 bg-white px-4 py-3',
        confirmed ? 'border-orange-400' : 'border-orange-200',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <strong className="text-sm">{redemption.reward.name}</strong>
        <RedemptionStatusBadge status={redemption.status} />
      </div>
      <p className="text-xs text-muted-foreground">
        {isoToDisplayDateTime(redemption.createdAt)} · {formatInteger(redemption.reward.points)} pts
      </p>

      {open && (
        <div id={detailId} className="mt-1 grid gap-1 border-t border-orange-100 pt-2">
          {confirmed ? (
            <>
              <div className="rounded-xl border border-dashed border-orange-400 bg-orange-50 px-3 py-2 text-center">
                <p className="text-2xl font-extrabold tracking-[0.18em] text-accent-800">
                  {redemption.code}
                </p>
                <p
                  className={cn(
                    'text-xs font-bold',
                    isExpiringSoon(redemption.expiresAt, now) ? 'text-red-700' : 'text-olive-800',
                  )}
                >
                  {expiresInText(redemption.expiresAt, now)}
                </p>
                <p className="text-xs">Presentá este código en caja.</p>
              </div>
              {redemption.canCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  className="self-start"
                  onClick={() => onCancel?.(redemption)}
                >
                  Cancelar canje
                </Button>
              )}
            </>
          ) : (
            resolvedNotes(redemption).map((note) => (
              <p key={note} className="text-sm">
                {note}
              </p>
            ))
          )}
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="md"
        aria-expanded={open}
        aria-controls={detailId}
        className="mt-1 w-full text-xs"
        onClick={() => setToggled(!open)}
      >
        {open ? 'Ocultar detalle ▴' : 'Ver detalle ▾'}
      </Button>
    </li>
  )
}
