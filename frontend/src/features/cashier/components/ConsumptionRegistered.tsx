import { DOCUMENT_TYPES } from '@/domain/documents'
import { LEVELS } from '@/domain/levels'
import type { Role } from '@/domain/roles'
import { FormActions } from '@/shared/components/forms/FormActions'
import { Alert } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { DataList } from '@/shared/components/ui/DataList'
import { PageCard } from '@/shared/components/ui/Page'
import { isoToDisplayDateTime } from '@/shared/lib/dates'
import { formatInteger, formatMoney } from '@/shared/lib/numbers'
import type { CreateConsumptionResult } from '../types/consumption'

type ConsumptionRegisteredProps = {
  result: CreateConsumptionResult
  role: Role
  onRegisterAnother: () => void
}

/** Pantalla "Consumo registrado" (US-21, CA-21.9 y CA-21.10). Todo sale de la respuesta del POST. */
export function ConsumptionRegistered({
  result,
  role,
  onRegisterAnother,
}: ConsumptionRegisteredProps) {
  const { consumption } = result
  const { customer } = consumption
  const fullName = `${customer.firstName} ${customer.lastName}`

  return (
    <PageCard title="Consumo registrado" variant="plain">
      {result.levelUp && (
        <Alert variant="success" className="mb-4 font-bold">
          ¡{fullName} subió a nivel {LEVELS[result.levelAfter]}!
        </Alert>
      )}

      <DataList
        items={[
          { label: 'Código de consumo', value: consumption.code },
          { label: 'Fecha y hora', value: isoToDisplayDateTime(consumption.createdAt) },
          {
            label: 'Cliente',
            value: `${fullName} · ${DOCUMENT_TYPES[customer.documentType].label} ${customer.documentNumber}`,
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
            value: `${formatInteger(result.balanceBefore)} pts → ${formatInteger(result.balanceAfter)} pts`,
          },
          { label: 'Registrado por', value: consumption.registeredBy.name },
        ]}
      />

      <FormActions>
        <Button type="button" variant="secondary" size="lg" onClick={onRegisterAnother}>
          Registrar otro consumo
        </Button>
        {/* Solo el Administrador (el Cajero no tiene la sección Consumos). Deshabilitado hasta
            que exista el detalle de consumos (US-23). */}
        {role === 'ADMIN' && (
          <Button type="button" size="lg" disabled>
            Ver detalle
          </Button>
        )}
      </FormActions>
    </PageCard>
  )
}
