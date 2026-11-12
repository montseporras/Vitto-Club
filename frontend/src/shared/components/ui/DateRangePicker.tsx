import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { isoToDmy, monthDays, monthTitle, shiftMonth, WEEKDAYS } from '@/shared/lib/calendar'
import { todayIsoInTimeZone } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/utils'

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'
type DateRangePickerProps = {
  /** id del botón que abre el calendario; lo usa el <label> */
  id: string
  label: string
  fromDate: string
  toDate: string
  onApply: (fromDate: string, toDate: string) => void
  /**
   * 'field': etiqueta de 13 px y botón con el aspecto de un campo (Auditoría).
   * 'bar': solo el botón plano de 34 px; la etiqueta la pone la celda de la barra de filtros
   * (Canjes y Consumos).
   */
  variant?: 'field' | 'bar'
}

/**
 * Rango de fechas con calendario (Auditoría, Canjes y Consumos). Las fechas son 'YYYY-MM-DD' en
 * hora de Argentina; "Listo" y "Limpiar" avisan con onApply.
 */
export function DateRangePicker({
  id,
  label,
  fromDate,
  toDate,
  onApply,
  variant = 'field',
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

  const days = useMemo(() => monthDays(visibleMonth), [visibleMonth])

  const hasRange = Boolean(fromDate || toDate)
  const rangeLabel = hasRange
    ? `${fromDate ? isoToDmy(fromDate) : 'dd/mm/aaaa'} – ${toDate ? isoToDmy(toDate) : 'dd/mm/aaaa'}`
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

  const triggerClass = cn(
    'flex cursor-pointer items-center gap-2 text-left',
    variant === 'bar'
      ? 'h-[34px] w-full border-0 bg-transparent p-0 text-[13px]'
      : 'h-[42px] w-full whitespace-nowrap rounded-xl border border-[#ecd3bd] bg-white px-3 text-sm outline-none focus-visible:border-[#a9532b] focus-visible:ring-[3px] focus-visible:ring-[#f5d6bf]',
    hasRange ? 'text-[#2b1a10]' : 'text-[#9c8f82]',
  )

  const navButtonClass =
    'h-7 cursor-pointer rounded-full px-2 font-bold text-[#7a3a1d] hover:bg-[#fdf0e4]'
  const footerButtonClass =
    'h-[30px] cursor-pointer rounded-full px-3 text-[13px] font-bold'

  return (
    <div className="relative min-w-0">
      {variant === 'field' && (
        <label className="mb-1.5 block text-[13px] font-semibold text-[#3b2a20]" htmlFor={id}>
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={openCalendar}
        className={triggerClass}
      >
        <Icon d={ICONS.calendar} className="size-[15px] shrink-0 text-[#7e3e20]" />
        <span className="truncate">{rangeLabel}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar calendario"
            className="fixed inset-0 z-50 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-label="Elegir rango de fechas"
            className="absolute top-[calc(100%+6px)] left-0 z-60 w-[280px] rounded-[14px] border border-[#f6d0b1] bg-white p-3 shadow-[0_20px_25px_-5px_rgba(126,62,32,0.15),0_8px_10px_-6px_rgba(126,62,32,0.12)]"
          >
            <header className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
                className={navButtonClass}
              >
                ‹
              </button>
              <h3 className="text-sm font-bold capitalize text-[#2b1a10]">
                {monthTitle(visibleMonth)}
              </h3>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
                className={navButtonClass}
              >
                ›
              </button>
            </header>

            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[11px] font-bold text-[#7a6e63]">
              {WEEKDAYS.map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
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
                    aria-label={isoToDmy(date)}
                    onClick={() => selectDay(date)}
                    className={cn(
                      'h-8 cursor-pointer rounded-lg text-[13px]',
                      selected
                        ? 'bg-[#a8532a] font-bold text-white'
                        : inRange
                          ? 'bg-[#fbe6d4] text-[#2b1a10]'
                          : 'text-[#2b1a10] hover:bg-[#fdf0e4]',
                      date === today && !selected && 'font-bold',
                    )}
                  >
                    {Number(date.slice(-2))}
                  </button>
                )
              })}
            </div>

            <p className="mt-2 text-xs text-[#7a6e63]">
              {draftFrom && !draftTo
                ? 'Ahora elegí la fecha de fin.'
                : draftFrom && draftTo
                  ? 'Rango seleccionado.'
                  : 'Elegí la fecha de inicio.'}
            </p>
            <footer className="mt-2.5 flex justify-between gap-2">
              <button
                type="button"
                className={cn(footerButtonClass, 'text-[#7a3a1d] hover:bg-[#fdf0e4]')}
                onClick={() => {
                  setDraftFrom('')
                  setDraftTo('')
                  onApply('', '')
                }}
              >
                Limpiar
              </button>
              <button
                type="button"
                className={cn(
                  footerButtonClass,
                  'border border-[#e9c9ad] bg-white text-[#7a3a1d] hover:bg-[#fdf0e4]',
                )}
                onClick={() => {
                  onApply(draftFrom, draftTo)
                  setOpen(false)
                }}
              >
                Listo
              </button>
            </footer>
          </section>
        </>
      )}
    </div>
  )
}
