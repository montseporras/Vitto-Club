// Modal "Canje {código}" de la pantalla Canjes del Administrador (US-45, CA-45.9, §3.12.3).
// Rechazar y Aplicar solo se ven con el canje Confirmado; abren las ventanas de US-43 y US-42.
import { DOCUMENT_TYPES } from '@/domain/documents'
import { Button } from '@/shared/components/ui/Button'
import { DataList } from '@/shared/components/ui/DataList'
import { Modal } from '@/shared/components/ui/Modal'
import { isoToDisplayDateTime } from '@/shared/lib/dates'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { expiresInText, isExpiringSoon } from '../lib/format'
import { resolverName } from '../lib/resolver'
import { useEscapeKey } from '../lib/use-escape-key'
import type { Redemption } from '../types/redemption'
import { RedemptionStatusBadge } from './RedemptionStatusBadge'

type RedemptionDetailModalProps = {
  redemption: Redemption
  now: number
  onClose: () => void
  /** Cierra el modal y abre la ventana "Registrar uso" (US-42). */
  onApply: (redemption: Redemption) => void
  /** Cierra el modal y abre la ventana "Rechazar canje" (US-43). */
  onReject: (redemption: Redemption) => void
}

function detailRows(redemption: Redemption) {
  const { customer, reward } = redemption
  const rows = [
    { label: 'Cliente', value: `${customer.firstName} ${customer.lastName}` },
    {
      label: 'Documento',
      value: `${DOCUMENT_TYPES[customer.documentType].label} ${customer.documentNumber}`,
    },
    { label: 'Recompensa', value: reward.name },
    { label: 'Puntos', value: `${formatInteger(reward.points)} pts` },
    { label: 'Fecha y hora', value: isoToDisplayDateTime(redemption.createdAt) },
    {
      label: 'Confirmado por',
      value: redemption.origin === 'APP' ? 'Cliente (app)' : (redemption.confirmedBy?.name ?? ''),
    },
    { label: 'Vence', value: isoToDisplayDateTime(redemption.expiresAt) },
  ]
  const resolvedAt = redemption.resolvedAt ? isoToDisplayDateTime(redemption.resolvedAt) : ''
  const by = `${resolverName(redemption)} · ${resolvedAt}`

  if (redemption.status === 'USED') {
    rows.push(
      { label: 'Aplicado por', value: by },
      { label: 'Puntos descontados', value: `−${formatInteger(reward.points)} pts` },
      {
        label: 'Saldo',
        value: `${formatInteger(redemption.balanceBefore ?? 0)} → ${formatInteger(
          redemption.balanceAfter ?? 0,
        )} pts`,
      },
    )
  }
  if (redemption.status === 'REJECTED') {
    rows.push(
      { label: 'Rechazado por', value: by },
      { label: 'Motivo', value: redemption.rejectionReason ?? '—' },
    )
  }
  if (redemption.status === 'CANCELLED') {
    rows.push({ label: 'Cancelado por', value: `El cliente, desde la app · ${resolvedAt}` })
  }
  if (redemption.status === 'EXPIRED') {
    rows.push({ label: 'Vencido', value: 'Pasaron 15 minutos sin usarse (Sistema)' })
  }
  return rows
}

export function RedemptionDetailModal({
  redemption,
  now,
  onClose,
  onApply,
  onReject,
}: RedemptionDetailModalProps) {
  useEscapeKey(onClose)
  const confirmed = redemption.status === 'CONFIRMED'

  return (
    <Modal title={`Canje ${redemption.code}`} onClose={onClose}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <RedemptionStatusBadge status={redemption.status} />
        {confirmed && (
          <span
            className={cn(
              'text-sm font-bold',
              isExpiringSoon(redemption.expiresAt, now) ? 'text-red-700' : 'text-olive-800',
            )}
          >
            {expiresInText(redemption.expiresAt, now)}
          </span>
        )}
      </div>

      <DataList items={detailRows(redemption)} />

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        {confirmed && (
          <>
            <Button type="button" variant="secondary" onClick={() => onReject(redemption)}>
              Rechazar
            </Button>
            <Button type="button" onClick={() => onApply(redemption)}>
              Aplicar
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
