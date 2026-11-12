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
import { DateRangePicker } from '@/shared/components/ui/DateRangePicker'
import { FilterSelect } from '@/shared/components/ui/FilterSelect'
import { Label } from '@/shared/components/ui/Label'
import { addDaysToIso, todayIsoInTimeZone } from '@/shared/lib/dates'
import { MyRedemptionItem } from './MyRedemptionItem'

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

// "Elegir fechas" reemplaza a "Día específico" y "Rango": un solo día filtra ese día; dos, el rango
type DateOption = 'any' | 'today' | 'last7' | 'month' | 'custom'

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
  { value: 'custom', label: 'Elegir fechas' },
]

type MyRedemptionsProps = {
  /** Abre el diálogo "Cancelar canje" (US-43). */
  onCancel?: (redemption: MyRedemption) => void
}

export function MyRedemptions({ onCancel }: MyRedemptionsProps) {
  const [status, setStatus] = useState<RedemptionStatusGroup | ''>('')
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [dateOption, setDateOption] = useState<DateOption>('any')
  // Fechas elegidas en el calendario ('YYYY-MM-DD')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Los atajos se arman con la fecha de hoy en hora de Argentina (§3.12.1)
  const today = todayIsoInTimeZone(ARGENTINA_TIME_ZONE)

  let dates: Pick<MyRedemptionFilters, 'fromDate' | 'toDate'> = {}
  if (dateOption === 'today') dates = { fromDate: today, toDate: today }
  else if (dateOption === 'last7') dates = { fromDate: addDaysToIso(today, -6), toDate: today }
  else if (dateOption === 'month') dates = { fromDate: `${today.slice(0, 8)}01`, toDate: today }
  else if (dateOption === 'custom' && from) dates = { fromDate: from, toDate: to || from }

  const filters: MyRedemptionFilters = { ...(status ? { status } : {}), ...dates, order }
  const hasFilters = status !== '' || Object.keys(dates).length > 0
  const result = useMyRedemptions(filters)
  const items = result.data?.items
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
          <FilterSelect
            id="my-redemptions-status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => setStatus(value as RedemptionStatusGroup | '')}
          />
        </div>
        <div>
          <Label htmlFor="my-redemptions-order">Orden</Label>
          <FilterSelect
            id="my-redemptions-order"
            value={order}
            options={ORDER_OPTIONS}
            onChange={(value) => setOrder(value as 'desc' | 'asc')}
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="my-redemptions-date">Fecha</Label>
          <FilterSelect
            id="my-redemptions-date"
            value={dateOption}
            options={DATE_OPTIONS}
            onChange={(value) => changeDateOption(value as DateOption)}
          />
        </div>
        {dateOption === 'custom' && (
          <div className="col-span-2">
            <DateRangePicker
              id="my-redemptions-date-range"
              label="Fechas"
              fromDate={from}
              toDate={to}
              onApply={(fromDate, toDate) => {
                setFrom(fromDate)
                setTo(toDate)
              }}
            />
          </div>
        )}
      </div>

      {result.isPending && <StatusText className="py-6 text-center">Cargando…</StatusText>}

      {result.isError && (
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

      {items?.length === 0 && (
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
