import { Link } from 'react-router'
import { DOCUMENT_TYPES } from '@/domain/documents'
import { LEVELS } from '@/domain/levels'
import { FormActions } from '@/shared/components/forms/FormActions'
import { Alert } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { DataList } from '@/shared/components/ui/DataList'
import { isoToArgentinaDateTime } from '@/shared/lib/dates'
import { formatInteger, formatMoney } from '@/shared/lib/numbers'
import { buttonVariants } from '@/styles/ui'
import type { CreateConsumptionResult } from '../types/consumption'

type ConsumptionRegisteredProps = {
  result: CreateConsumptionResult
  /** "Ver detalle" es solo del Administrador (CA-21.10) */
  canViewDetail: boolean
  onRegisterAnother: () => void
}

/**
 * Pantalla "Consumo registrado" (US-21, contrato §3.1.3): resumen de lo que acreditó el
 * backend, con el aviso de subida de nivel cuando corresponde.
 */
export function ConsumptionRegistered({
  result,
  canViewDetail,
  onRegisterAnother,
}: ConsumptionRegisteredProps) {
  const { consumption, balanceBefore, balanceAfter, levelUp, levelAfter } = result
  const { customer } = consumption

  const rows = [
    { label: 'Código de consumo', value: consumption.code },
    { label: 'Fecha y hora', value: isoToArgentinaDateTime(consumption.createdAt) },
    {
      label: 'Cliente',
      value: `${customer.firstName} ${customer.lastName} · ${DOCUMENT_TYPES[customer.documentType].label} ${customer.documentNumber}`,
    },
    { label: 'Monto', value: formatMoney(consumption.amount) },
    {
      label: 'Puntos acreditados',
      value:
        `+${formatInteger(consumption.totalPoints)} pts` +
        (consumption.bonusPoints > 0
          ? ` (incluye ${formatInteger(consumption.bonusPoints)} de bonificación por primer consumo)`
          : ''),
    },
    { label: 'Observaciones', value: consumption.notes ?? '—' },
    {
      label: 'Saldo',
      value: `${formatInteger(balanceBefore)} pts → ${formatInteger(balanceAfter)} pts`,
    },
    { label: 'Registrado por', value: consumption.registeredBy.name },
  ]

  return (
    <section aria-labelledby="consumption-registered-title" className="mt-7">
      <h3 id="consumption-registered-title" className="text-xl font-bold text-ink">
        Consumo registrado
      </h3>

      {levelUp && (
        <Alert variant="success" className="mt-4 font-bold">
          ¡{customer.firstName} {customer.lastName} subió a nivel {LEVELS[levelAfter]}!
        </Alert>
      )}

      <DataList items={rows} className="mt-4" />

      <FormActions>
        <Button type="button" variant="secondary" size="lg" onClick={onRegisterAnother}>
          Registrar otro consumo
        </Button>
        {canViewDetail && (
          // Detalle del consumo (US-23). Relativo a /caja/cliente: un feature no importa de app/
          <Link
            to={`../../admin/consumos/${consumption.code}`}
            relative="path"
            className={buttonVariants({ size: 'lg' })}
          >
            Ver detalle
          </Link>
        )}
      </FormActions>
    </section>
  )
}
