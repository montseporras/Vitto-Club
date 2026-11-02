// Mis canjes del Cliente (US-45, contrato §3.12.1 y prototipo ClienteCanjes → Mis canjes):
// filtros de estado, fecha y orden, y la lista de canjes con su cuenta regresiva.
import { useState } from 'react'
import {
  useExpiryRefetch,
  useMyRedemptions,
  type MyRedemption,
  type MyRedemptionFilters,
  type RedemptionStatusGroup,
} from '@/features/redemptions'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { DateInput } from '@/shared/components/ui/DateInput'
import { Label } from '@/shared/components/ui/Label'
import { Select } from '@/shared/components/ui/Select'
import { addDaysToIso, displayDateToIso, todayIsoInTimeZone } from '@/shared/lib/dates'
import { MyRedemptionItem } from './MyRedemptionItem'

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

type DateOption = 'any' | 'today' | 'last7' | 'month' | 'day' | 'range'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'CONFIRMED', label: 'Confirmados' },
  { value: 'FINISHED', label: 'Finalizados' },
]

const ORDER_OPTIONS = [
  { value: 'desc', label: 'Más recientes' },
  { value: 'asc', label: 'Más antiguos' },
]

const DATE_OPTIONS = [
  { value: 'any', label: 'Cualquiera' },
  { value: 'today', label: 'Hoy' },
  { value: 'last7', label: 'Últimos 7 días' },
  { value: 'month', label: 'Este mes' },
  { value: 'day', label: 'Día específico' },
  { value: 'range', label: 'Rango' },
]

const RANGE_ERROR = 'La fecha "hasta" no puede ser anterior a "desde".'

type MyRedemptionsProps = {
  /** Abre la ventana "Cancelar canje" (US-43). Mientras no exista, el botón no hace nada. */
  onCancel?: (redemption: MyRedemption) => void
}

export function MyRedemptions({ onCancel }: MyRedemptionsProps) {
  const [status, setStatus] = useState<RedemptionStatusGroup | ''>('')
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [dateOption, setDateOption] = useState<DateOption>('any')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Los atajos se arman con la fecha de hoy en hora de Argentina (§3.12.1)
  const today = todayIsoInTimeZone(ARGENTINA_TIME_ZONE)
  const fromIso = displayDateToIso(from)
  const toIso = displayDateToIso(to)
  const invertedRange =
    dateOption === 'range' && fromIso !== null && toIso !== null && toIso < fromIso

  let dates: Pick<MyRedemptionFilters, 'fromDate' | 'toDate'> = {}
  if (dateOption === 'today') dates = { fromDate: today, toDate: today }
  else if (dateOption === 'last7') dates = { fromDate: addDaysToIso(today, -6), toDate: today }
  else if (dateOption === 'month') dates = { fromDate: `${today.slice(0, 8)}01`, toDate: today }
  else if (dateOption === 'day' && fromIso) dates = { fromDate: fromIso, toDate: fromIso }
  else if (dateOption === 'range') {
    dates = { ...(fromIso ? { fromDate: fromIso } : {}), ...(toIso ? { toDate: toIso } : {}) }
  }

  const filters: MyRedemptionFilters = { ...(status ? { status } : {}), ...dates, order }
  const hasFilters = status !== '' || Object.keys(dates).length > 0
  const result = useMyRedemptions(filters, !invertedRange)
  const items = invertedRange ? [] : result.data?.items
  const now = useExpiryRefetch(items, result.refetch)

  const changeDateOption = (value: DateOption) => {
    setDateOption(value)
    setFrom('')
    setTo('')
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="my-redemptions-status">Estado</Label>
          <Select
            id="my-redemptions-status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(event) => setStatus(event.target.value as RedemptionStatusGroup | '')}
          />
        </div>
        <div>
          <Label htmlFor="my-redemptions-order">Orden</Label>
          <Select
            id="my-redemptions-order"
            value={order}
            options={ORDER_OPTIONS}
            onChange={(event) => setOrder(event.target.value as 'desc' | 'asc')}
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="my-redemptions-date">Fecha</Label>
          <Select
            id="my-redemptions-date"
            value={dateOption}
            options={DATE_OPTIONS}
            onChange={(event) => changeDateOption(event.target.value as DateOption)}
          />
        </div>
        {dateOption === 'day' && (
          <div className="col-span-2">
            <DateInput aria-label="Día" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
        )}
        {dateOption === 'range' && (
          <>
            <DateInput aria-label="Desde" value={from} onChange={(event) => setFrom(event.target.value)} />
            <DateInput aria-label="Hasta" value={to} onChange={(event) => setTo(event.target.value)} />
          </>
        )}
      </div>

      {invertedRange && (
        <p role="alert" className="text-xs text-accent-800">
          {RANGE_ERROR}
        </p>
      )}

      {!invertedRange && result.isPending && (
        <StatusText className="py-6 text-center">Cargando…</StatusText>
      )}

      {!invertedRange && result.isError && (
        <Alert variant="error">
          <AlertMessages messages={result.error.messages} />
        </Alert>
      )}

      {items && items.length > 0 && (
        <ul className="grid gap-3">
          {items.map((redemption) => (
            <MyRedemptionItem
              key={redemption.id}
              redemption={redemption}
              now={now}
              onCancel={onCancel}
            />
          ))}
        </ul>
      )}

      {!invertedRange && items?.length === 0 && (
        <StatusText className="rounded-xl border border-dashed border-orange-200 px-3 py-5 text-center">
          {hasFilters ? 'No hay canjes para los filtros elegidos.' : 'Todavía no tenés canjes.'}
        </StatusText>
      )}

      <StatusText className="text-xs">
        Si un canje se cancela, se rechaza o vence, no se descuentan puntos. Lo podés volver a pedir si
        tenés puntos.
      </StatusText>
    </div>
  )
}
