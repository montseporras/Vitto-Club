// Ventana "Registrar uso del canje {código}" (US-42, CA-42.4 a CA-42.6 y CA-42.10, contrato §3.9.2 y
// prototipo CanjeAccion, acción `usar`). Es la misma desde el panel del cliente en Caja, desde
// "Sí, aplicar" de US-40, desde Canjes del Administrador y, cuando exista, desde Canjes por
// código (US-41). Recién acá se descuentan los puntos y el stock.
import { DOCUMENT_TYPES, type DocumentType } from '@/domain/documents'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { DataList } from '@/shared/components/ui/DataList'
import { Modal } from '@/shared/components/ui/Modal'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { pointsToneStyles } from '@/styles/ui'
import { useRegisterRedemptionUse } from '../api/redemptions.queries'
import { expiresInText, isExpiringSoon } from '../lib/format'
import { useEscapeKey } from '../lib/use-escape-key'
import { useNow } from '../lib/use-now'
import type { ConfirmedRedemption } from '../types/redemption'

type RegisterUseModalProps = {
  /** El canje a usar; sirve tanto el completo como el recién confirmado */
  redemption: ConfirmedRedemption
  customer: {
    id: number
    firstName: string
    lastName: string
    documentType: DocumentType
    documentNumber: string
  }
  onClose: () => void
  /** Se avisa cuando el uso quedó registrado: cambió el saldo del cliente. */
  onUsed?: () => void
  /**
   * "Rechazar canje" (con saldo insuficiente o recompensa no disponible): cierra esta ventana y
   * el que la abrió muestra "Rechazar canje" (US-43).
   */
  onReject?: (code: string) => void
}

// Errores tras los que el canje sigue Confirmado y se puede rechazar (§3.9.2)
const REJECTABLE_ERRORS = ['INSUFFICIENT_BALANCE', 'REWARD_NOT_AVAILABLE']

export function RegisterUseModal({
  redemption,
  customer,
  onClose,
  onUsed,
  onReject,
}: RegisterUseModalProps) {
  const register = useRegisterRedemptionUse(customer.id)
  const now = useNow(1000)
  useEscapeKey(onClose)

  const points = redemption.reward.points
  const customerName = `${customer.firstName} ${customer.lastName}`
  const customerLine = `${customerName} · ${DOCUMENT_TYPES[customer.documentType].label} ${customer.documentNumber}`
  const result = register.data
  const error = register.error

  if (result) {
    return (
      <Modal title="Canje utilizado" onClose={onClose} className="max-w-3xl">
        <Alert variant="success">
          <strong>
            Canje {redemption.code} utilizado. Entregar: {redemption.reward.name}.
          </strong>
        </Alert>
        <DataList
          className="mt-4"
          items={[
            {
              label: 'Puntos descontados',
              value: (
                <strong className={pointsToneStyles.negative}>−{formatInteger(points)} pts</strong>
              ),
            },
            {
              label: 'Saldo',
              value: (
                <>
                  {formatInteger(result.balanceBefore)} pts →{' '}
                  <strong>{formatInteger(result.balanceAfter)} pts</strong>
                </>
              ),
            },
            { label: 'Cliente', value: customerLine },
          ]}
        />
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={onClose}>
            Listo
          </Button>
        </div>
      </Modal>
    )
  }

  const canReject = Boolean(error?.code && REJECTABLE_ERRORS.includes(error.code))

  return (
    <Modal title={`Registrar uso del canje ${redemption.code}`} onClose={onClose} className="max-w-3xl">
      <DataList
        items={[
          { label: 'Código', value: redemption.code },
          { label: 'Cliente', value: customerLine },
          { label: 'Recompensa', value: redemption.reward.name },
          { label: 'Puntos a descontar', value: `−${formatInteger(points)} pts` },
          {
            label: 'Vence',
            value: (
              <span className={cn(isExpiringSoon(redemption.expiresAt, now) && 'text-red-700')}>
                {expiresInText(redemption.expiresAt, now)}
              </span>
            ),
          },
        ]}
      />
      <p className="mt-4">
        ¿Registrar el uso del canje <strong>{redemption.code}</strong>? Entregá:{' '}
        <strong>{redemption.reward.name}</strong>. Se van a descontar {formatInteger(points)} pts.
      </p>

      {error && (
        <Alert variant="error" className="mt-3">
          <AlertMessages messages={error.messages} />
        </Alert>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        {canReject && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onReject?.(redemption.code)
              onClose()
            }}
          >
            Rechazar canje
          </Button>
        )}
        {/* Con un error, el canje ya no se puede usar desde esta ventana */}
        {!error && (
          <Button
            type="button"
            disabled={register.isPending}
            onClick={() => register.mutate(redemption.code, { onSuccess: () => onUsed?.() })}
          >
            Confirmar
          </Button>
        )}
      </div>
    </Modal>
  )
}
