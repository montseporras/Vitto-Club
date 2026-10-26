import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { todayIsoInTimeZone } from '@/shared/lib/dates'

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function monthTitle(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function shiftMonth(value: string, amount: number) {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

type DateRangePickerProps = {
  /** id del botón que abre el calendario; lo usa el <label> */
  id: string
  label: string
  fromDate: string
  toDate: string
  onApply: (fromDate: string, toDate: string) => void
}

/**
 * Rango de fechas con calendario (Auditoría y Consumos). Las fechas son 'YYYY-MM-DD' en hora de
 * Argentina; "Listo" y "Limpiar" avisan con onApply.
 */
export function DateRangePicker({
  id,
  label,
  fromDate,
  toDate,
  onApply,
}: DateRangePickerProps) {
  const today = todayIsoInTimeZone(ARGENTINA_TIME_ZONE)
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(today.slice(0, 7))
  const [draftFrom, setDraftFrom] = useState(fromDate)
  const [draftTo, setDraftTo] = useState(toDate)

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  const days = useMemo(() => {
    const [year, month] = visibleMonth.split('-').map(Number)
    const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7
    const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: count }, (_, index) =>
        `${visibleMonth}-${String(index + 1).padStart(2, '0')}`,
      ),
    ]
  }, [visibleMonth])

  const rangeLabel =
    fromDate || toDate
      ? `${fromDate ? fromDate.split('-').reverse().join('/') : 'dd/mm/aaaa'} – ${
          toDate ? toDate.split('-').reverse().join('/') : 'dd/mm/aaaa'
        }`
      : 'dd/mm/aaaa – dd/mm/aaaa'

  const openCalendar = () => {
    const anchor = fromDate || today
    setDraftFrom(fromDate)
    setDraftTo(toDate)
    setVisibleMonth(anchor.slice(0, 7))
    setOpen(true)
  }

  const selectDay = (date: string) => {
    if (!draftFrom || draftTo) {
      setDraftFrom(date)
      setDraftTo('')
    } else if (date < draftFrom) {
      setDraftFrom(date)
      setDraftTo('')
    } else {
      setDraftTo(date)
    }
  }

  return (
    <div className="relative min-w-0">
      <label className="mb-1.5 block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <Button
        id={id}
        type="button"
        variant="secondary"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={openCalendar}
        className="w-full justify-start gap-2 truncate"
      >
        <Icon d={ICONS.calendar} className="size-4 shrink-0" />
        {rangeLabel}
      </Button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar calendario"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-label="Elegir rango de fechas"
            className="absolute left-0 top-full z-50 mt-1 w-[280px] rounded-xl border border-orange-200 bg-white p-3 shadow-xl"
          >
            <header className="mb-2 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="md"
                aria-label="Mes anterior"
                onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
                className="h-8 w-8 p-0"
              >
                ‹
              </Button>
              <h3 className="font-semibold capitalize">{monthTitle(visibleMonth)}</h3>
              <Button
                type="button"
                variant="ghost"
                size="md"
                aria-label="Mes siguiente"
                onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
                className="h-8 w-8 p-0"
              >
                ›
              </Button>
            </header>

            <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-stone-600">
              {WEEKDAYS.map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                if (!date) return <span key={`empty-${index}`} aria-hidden="true" />
                const selected = date === draftFrom || date === draftTo
                const inRange =
                  Boolean(draftFrom && draftTo) && date > draftFrom && date < draftTo
                return (
                  <button
                    key={date}
                    type="button"
                    aria-pressed={selected}
                    aria-label={date.split('-').reverse().join('/')}
                    onClick={() => selectDay(date)}
                    className={`h-8 rounded-lg text-sm hover:bg-orange-100 ${
                      selected
                        ? 'bg-orange-700 font-semibold text-white hover:bg-orange-800'
                        : inRange
                          ? 'bg-orange-100 text-stone-900'
                          : 'text-stone-800'
                    }`}
                  >
                    {Number(date.slice(-2))}
                  </button>
                )
              })}
            </div>

            <p className="mt-2 text-xs text-stone-600">
              {draftFrom && !draftTo
                ? 'Ahora elegí la fecha de fin.'
                : draftFrom && draftTo
                  ? 'Rango seleccionado.'
                  : 'Elegí la fecha de inicio.'}
            </p>
            <footer className="mt-3 flex justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="h-8 px-3"
                onClick={() => {
                  setDraftFrom('')
                  setDraftTo('')
                  onApply('', '')
                }}
              >
                Limpiar
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="h-8 px-3"
                onClick={() => {
                  onApply(draftFrom, draftTo)
                  setOpen(false)
                }}
              >
                Listo
              </Button>
            </footer>
          </section>
        </>
      )}
    </div>
  )
}
