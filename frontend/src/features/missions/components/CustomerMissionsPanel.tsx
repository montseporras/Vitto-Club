import type { ApiError } from '@/shared/api/ApiError'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Select } from '@/shared/components/ui/Select'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { isoToDisplayDate } from '@/shared/lib/dates'
import { addMonths, monthKeyInArgentina, monthLabel } from '../lib/mission-presentation'
import type { CustomerMission } from '../types/mission'
import { CustomerMissionCard } from './CustomerMissionCard'

type CustomerMissionsPanelProps = {
  missions: CustomerMission[] | undefined
  period: string
  onPeriodChange: (period: string) => void
  isPending: boolean
  error?: ApiError | null
  showCustomerNote?: boolean
}

function monthEndDate(period: string) {
  const [year, month] = period.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

function previousMonthOptions(currentMonth: string) {
  return [
    { value: '', label: 'Este mes' },
    { value: '__previous-months', label: 'Meses anteriores', disabled: true },
    ...Array.from({ length: 12 }, (_, index) => {
      const month = addMonths(currentMonth, -(index + 1))
      return { value: month, label: monthLabel(month, true) }
    }),
  ]
}

export function CustomerMissionsPanel({
  missions,
  period,
  onPeriodChange,
  isPending,
  error,
  showCustomerNote = false,
}: CustomerMissionsPanelProps) {
  const currentMonth = monthKeyInArgentina()
  const selectedMonth = period || currentMonth
  const title = period
    ? `Misiones de ${monthLabel(period).toLowerCase()}`
    : 'Misiones del mes'
  const subtitle = period
    ? 'Mes terminado'
    : `Termina el ${isoToDisplayDate(monthEndDate(selectedMonth))}`

  return (
    <div className="mx-auto grid w-full max-w-xl gap-4">
      <div className="flex items-end justify-between gap-3 border-b border-accent-200 pb-1.5">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-[0.08em]">{title}</h1>
          <p className="mt-1 text-xs text-neutral-600">{subtitle}</p>
        </div>
        <label className="sr-only" htmlFor="customer-missions-period">
          Meses anteriores
        </label>
        <Select
          id="customer-missions-period"
          aria-label="Meses anteriores"
          value={period}
          onChange={(event) => onPeriodChange(event.target.value)}
          options={previousMonthOptions(currentMonth)}
          className="h-9 w-auto min-w-36 py-1 text-xs"
        />
      </div>

      {isPending && <StatusText className="py-8 text-center">Cargando…</StatusText>}

      {error && (
        <Alert variant="error">
          {error.messages.length > 0 ? (
            <AlertMessages messages={error.messages} />
          ) : (
            <p>{error.message}</p>
          )}
        </Alert>
      )}

      {!isPending && !error && missions?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-accent-200 px-4 py-6 text-center text-sm text-ink">
          {period
            ? 'No tuviste misiones ese mes.'
            : 'No hay misiones este mes. ¡Volvé pronto!'}
        </p>
      )}

      {!isPending && !error && missions && missions.length > 0 && (
        <div className="grid gap-3">
          {missions.map((mission) => (
            <CustomerMissionCard
              key={`${mission.period}-${mission.id ?? mission.mission.id}`}
              mission={mission}
            />
          ))}
        </div>
      )}

      {showCustomerNote && (
        <p className="text-xs leading-relaxed text-neutral-600">
          Las misiones suman con cada consumo que cumple la condición. Si completás una misión y no
          reclamás la recompensa, se reclama sola a fin de mes. Los puntos de las misiones no cuentan
          para tu nivel.
        </p>
      )}
    </div>
  )
}
