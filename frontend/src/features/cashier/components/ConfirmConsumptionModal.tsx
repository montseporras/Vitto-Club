import { useEffect, useState } from 'react'
import { useToast } from '@/shared/components/feedback/useToast'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { FormActions } from '@/shared/components/forms/FormActions'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/ui/Modal'
import { formatInteger, formatMoney } from '@/shared/lib/numbers'
import { consumptionError } from '../api/consumption-errors'
import { useConsumptionPreview, useCreateConsumption } from '../api/cashier.queries'
import { NOTES_MAX_LENGTH } from '../schemas/consumption.schema'
import type { CreateConsumptionResult } from '../types/consumption'

type ConfirmConsumptionModalProps = {
  customerId: number
  amount: number
  onCancel: () => void
  onRegistered: (result: CreateConsumptionResult) => void
}

/**
 * Advertencia previa al registro (US-21): los puntos que se van a acreditar, con las
 * observaciones opcionales. Los valores salen de GET /consumos/preview; "Aceptar" registra.
 */
export function ConfirmConsumptionModal({
  customerId,
  amount,
  onCancel,
  onRegistered,
}: ConfirmConsumptionModalProps) {
  const [notes, setNotes] = useState('')
  const showToast = useToast()
  const preview = useConsumptionPreview(customerId, amount)
  const create = useCreateConsumption()

  // El diálogo se cierra con Escape
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !create.isPending) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel, create.isPending])

  const accept = () => {
    create.mutate(
      // Vacío se guarda como null (contrato §3.1.3)
      { customerId, amount, notes: notes.trim() || null },
      {
        onSuccess: (result) => {
          const { code, totalPoints } = result.consumption
          // La subida de nivel va en la pantalla "Consumo registrado", no en el toast
          showToast(`Consumo ${code} registrado: +${formatInteger(totalPoints)} pts.`)
          onRegistered(result)
        },
      },
    )
  }

  const data = preview.data
  const failure = create.error ?? (preview.isError ? preview.error : null)
  const error = failure ? consumptionError(failure) : null

  return (
    <Modal title="Registrar consumo" onClose={create.isPending ? undefined : onCancel}>
      {preview.isPending && <StatusText>Cargando…</StatusText>}

      {data && (
        <div className="rounded-2xl border border-accent-200 bg-accent-50/60 px-5 py-3.5">
          <p className="text-base font-bold text-accent-800">
            Se acreditarán {formatInteger(data.totalPoints)} puntos
            {data.bonusPoints > 0 &&
              ` (${formatInteger(data.points)} + ${formatInteger(data.bonusPoints)} de bonificación por primer consumo)`}
          </p>
          <p className="mt-0.5 text-sm text-ink">
            Saldo resultante: <strong>{formatInteger(data.balanceAfter)} pts</strong>
          </p>
          <p className="mt-2 text-xs text-neutral-600">
            Equivalencia vigente: {formatMoney(data.equivalence.baseAmount)} ={' '}
            {formatInteger(data.equivalence.pointsAwarded)} pts
          </p>
        </div>
      )}

      <div className="mt-5">
        <FormField
          id="consumption-notes"
          label="Observaciones"
          optional
          hint={`${notes.length}/${NOTES_MAX_LENGTH}`}
        >
          <Input
            id="consumption-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={NOTES_MAX_LENGTH}
            autoComplete="off"
            autoFocus
            aria-describedby="consumption-notes-hint"
          />
        </FormField>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error.text}
          <AlertMessages messages={error.details} />
        </Alert>
      )}

      <FormActions>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={create.isPending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={!data || create.isPending}
          onClick={accept}
        >
          Aceptar
        </Button>
      </FormActions>
    </Modal>
  )
}
