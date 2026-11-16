import { useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/shared/lib/utils'
import { splitDateStyles } from '@/styles/ui'
import { Input } from './Input'

type Parts = { day: string; month: string; year: string }

type SplitDateInputProps = {
  /** Id del primer campo (Día): lo usa la etiqueta del FormField. */
  id: string
  /** Fecha como texto 'DD/MM/AAAA' (o '' si está vacía), igual que DateInput. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  name?: string
  disabled?: boolean
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  /** Clase extra para los tres campos (ej. el alto de los formularios de ingreso). */
  inputClassName?: string
}

const toParts = (value: string): Parts => {
  const [day = '', month = '', year = ''] = value.split('/')
  return { day, month, year }
}

const toValue = ({ day, month, year }: Parts) => (day || month || year ? `${day}/${month}/${year}` : '')

const digits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max)

/**
 * Fecha de nacimiento en tres campos (Día · Mes · Año) en lugar de un calendario: para una fecha
 * de hace décadas, navegar el calendario mes a mes es tedioso. Abre el teclado numérico y pasa
 * solo al campo siguiente al completar cada uno.
 */
export function SplitDateInput({
  id,
  value,
  onChange,
  onBlur,
  name,
  disabled,
  inputClassName,
  ...aria
}: SplitDateInputProps) {
  const [parts, setParts] = useState<Parts>(() => toParts(value))
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)
  const dayRef = useRef<HTMLInputElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)

  // Si el formulario cambia la fecha desde afuera (ej. al reiniciarlo), se refleja en los campos
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    if (value !== toValue(parts)) setParts(toParts(value))
  }

  const update = (next: Parts) => {
    setParts(next)
    setLastValue(toValue(next))
    onChange(toValue(next))
  }

  // Al salir de un campo, "5" pasa a "05"
  const pad = (key: 'day' | 'month') => {
    if (parts[key].length === 1) update({ ...parts, [key]: parts[key].padStart(2, '0') })
  }

  // Backspace en un campo vacío vuelve al anterior
  const backOnEmpty = (event: KeyboardEvent<HTMLInputElement>, previous: HTMLInputElement | null) => {
    if (event.key === 'Backspace' && event.currentTarget.value === '') previous?.focus()
  }

  // onBlur del grupo: solo cuando el foco sale de los tres campos
  const handleBlur = (event: React.FocusEvent) => {
    if (!groupRef.current?.contains(event.relatedTarget as Node | null)) onBlur?.()
  }

  const common = {
    type: 'text' as const,
    inputMode: 'numeric' as const,
    disabled,
    'aria-invalid': aria['aria-invalid'],
    'aria-describedby': aria['aria-describedby'],
  }

  return (
    <div ref={groupRef} role="group" aria-labelledby={`${id}-label`} className={splitDateStyles.root} onBlur={handleBlur}>
      <label className={splitDateStyles.part}>
        <Input
          ref={dayRef}
          id={id}
          name={name ? `${name}-day` : undefined}
          placeholder="DD"
          maxLength={2}
          {...common}
          autoComplete="bday-day"
          className={cn(splitDateStyles.short, inputClassName)}
          value={parts.day}
          onChange={(event) => {
            const day = digits(event.target.value, 2)
            update({ ...parts, day })
            if (day.length === 2) monthRef.current?.focus()
          }}
          onBlurCapture={() => pad('day')}
        />
        <span className={splitDateStyles.caption}>Día</span>
      </label>
      <label className={splitDateStyles.part}>
        <Input
          ref={monthRef}
          name={name ? `${name}-month` : undefined}
          placeholder="MM"
          maxLength={2}
          {...common}
          autoComplete="bday-month"
          className={cn(splitDateStyles.short, inputClassName)}
          value={parts.month}
          onKeyDown={(event) => backOnEmpty(event, dayRef.current)}
          onChange={(event) => {
            const month = digits(event.target.value, 2)
            update({ ...parts, month })
            if (month.length === 2) yearRef.current?.focus()
          }}
          onBlurCapture={() => pad('month')}
        />
        <span className={splitDateStyles.caption}>Mes</span>
      </label>
      <label className={splitDateStyles.part}>
        <Input
          ref={yearRef}
          name={name ? `${name}-year` : undefined}
          placeholder="AAAA"
          maxLength={4}
          {...common}
          autoComplete="bday-year"
          className={cn(splitDateStyles.long, inputClassName)}
          value={parts.year}
          onKeyDown={(event) => backOnEmpty(event, monthRef.current)}
          onChange={(event) => update({ ...parts, year: digits(event.target.value, 4) })}
        />
        <span className={splitDateStyles.caption}>Año</span>
      </label>
    </div>
  )
}
