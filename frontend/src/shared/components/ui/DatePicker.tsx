import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { isoToDmy, monthDays, monthTitle, shiftMonth, WEEKDAYS } from '@/shared/lib/calendar'
import { todayIsoInTimeZone } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/utils'
import { inputStyles } from '@/styles/ui'

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

type DatePickerProps = {
  /** id del botón que abre el calendario; lo usa el <label>. */
  id: string
  /** 'YYYY-MM-DD' o '' si no hay fecha. */
  value: string
  onChange: (value: string) => void
  /** Primer día que se puede elegir ('YYYY-MM-DD'). */
  min?: string
  disabled?: boolean
  invalid?: boolean
  'aria-describedby'?: string
  /** Hacia dónde se abre el calendario; hacia arriba cuando el campo está al pie de un modal. */
  placement?: 'bottom' | 'top'
}

/**
 * Un día con calendario, con el mismo formato que el rango de fechas de Consumos. El valor es
 * 'YYYY-MM-DD' (hora de Argentina); reemplaza al input type="date" del navegador.
 */
export function DatePicker({
  id,
  value,
  onChange,
  min,
  disabled,
  invalid,
  'aria-describedby': describedBy,
  placement = 'bottom',
}: DatePickerProps) {
  const today = todayIsoInTimeZone(ARGENTINA_TIME_ZONE)
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState((value || today).slice(0, 7))

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', closeOnEscape, true)
    return () => document.removeEventListener('keydown', closeOnEscape, true)
  }, [open])

  const days = useMemo(() => monthDays(visibleMonth), [visibleMonth])

  const openCalendar = () => {
    setVisibleMonth((value || min || today).slice(0, 7))
    setOpen(true)
  }

  return (
    <div className="relative min-w-0">
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={openCalendar}
        className={cn(
          inputStyles,
          'flex cursor-pointer items-center gap-2 text-left',
          value ? 'text-text' : 'text-neutral-500',
        )}
      >
        <Icon d={ICONS.calendar} className="size-4 shrink-0 text-[#7e3e20]" />
        <span className="truncate">{value ? isoToDmy(value) : 'dd/mm/aaaa'}</span>
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
            aria-label="Elegir fecha"
            className={cn(
              'absolute left-0 z-60 w-[280px] rounded-[14px] border border-[#f6d0b1] bg-white p-3 shadow-[0_20px_25px_-5px_rgba(126,62,32,0.15),0_8px_10px_-6px_rgba(126,62,32,0.12)]',
              placement === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
            )}
          >
            <header className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
                className="h-7 cursor-pointer rounded-full px-2 font-bold text-[#7a3a1d] hover:bg-[#fdf0e4]"
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
                className="h-7 cursor-pointer rounded-full px-2 font-bold text-[#7a3a1d] hover:bg-[#fdf0e4]"
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
                const selected = date === value
                const blocked = Boolean(min && date < min)
                return (
                  <button
                    key={date}
                    type="button"
                    aria-pressed={selected}
                    aria-label={isoToDmy(date)}
                    disabled={blocked}
                    onClick={() => {
                      onChange(date)
                      setOpen(false)
                    }}
                    className={cn(
                      'h-8 cursor-pointer rounded-lg text-[13px] disabled:cursor-not-allowed disabled:text-[#c9bdb1]',
                      selected
                        ? 'bg-[#a8532a] font-bold text-white'
                        : 'text-[#2b1a10] hover:bg-[#fdf0e4] disabled:hover:bg-transparent',
                      date === today && !selected && 'font-bold',
                    )}
                  >
                    {Number(date.slice(-2))}
                  </button>
                )
              })}
            </div>

            <footer className="mt-2.5 flex justify-between gap-2">
              <button
                type="button"
                className="h-[30px] cursor-pointer rounded-full px-3 text-[13px] font-bold text-[#7a3a1d] hover:bg-[#fdf0e4]"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                Limpiar
              </button>
              <button
                type="button"
                className="h-[30px] cursor-pointer rounded-full border border-[#e9c9ad] bg-white px-3 text-[13px] font-bold text-[#7a3a1d] hover:bg-[#fdf0e4]"
                onClick={() => setOpen(false)}
              >
                Cerrar
              </button>
            </footer>
          </section>
        </>
      )}
    </div>
  )
}
