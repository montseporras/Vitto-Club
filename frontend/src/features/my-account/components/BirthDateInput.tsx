import { useRef, type ChangeEvent, type ComponentProps } from 'react'
import { DateInput } from '@/shared/components/ui/DateInput'
import { Icon } from '@/shared/components/ui/Icon'
import { displayDateToIso, isoToDisplayDate, todayIso } from '@/shared/lib/dates'
import { passwordInputStyles } from '@/styles/ui'

// Ícono de calendario (solo lo usa este campo)
const CALENDAR_ICON =
  'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'

/**
 * Fecha de nacimiento de Mi perfil: el DateInput de siempre (se puede tipear) más
 * un botón que abre el calendario del navegador. La fecha elegida se escribe en
 * el texto y se valida igual que si se hubiera tipeado.
 */
export function BirthDateInput({ onChange, ref, ...props }: ComponentProps<typeof DateInput>) {
  const textRef = useRef<HTMLInputElement | null>(null)
  const pickerRef = useRef<HTMLInputElement>(null)

  // El ref de react-hook-form y el propio apuntan al mismo campo
  const setTextRef = (element: HTMLInputElement | null) => {
    textRef.current = element
    if (typeof ref === 'function') ref(element)
    else if (ref) ref.current = element
  }

  const openPicker = () => {
    const picker = pickerRef.current
    const text = textRef.current
    if (!picker || !text) return
    // El calendario abre en la fecha escrita, si es válida
    picker.value = displayDateToIso(text.value) ?? ''
    try {
      picker.showPicker()
    } catch {
      // Navegadores sin showPicker: el foco en el campo nativo también lo abre
      picker.focus()
      picker.click()
    }
  }

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const text = textRef.current
    if (!text || !event.target.value) return
    text.value = isoToDisplayDate(event.target.value)
    onChange?.({ ...event, target: text, currentTarget: text })
    text.focus()
  }

  return (
    <div className={passwordInputStyles.root}>
      <DateInput
        ref={setTextRef}
        onChange={onChange}
        className={passwordInputStyles.input}
        {...props}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Elegir fecha en el calendario"
        title="Elegir fecha en el calendario"
        className={passwordInputStyles.toggle}
      >
        <Icon d={CALENDAR_ICON} />
      </button>
      {/* El campo nativo no se ve: solo aporta el calendario, que se abre junto al botón */}
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        max={todayIso()}
        onChange={onPick}
        className="pointer-events-none absolute right-2 bottom-0 size-px opacity-0"
      />
    </div>
  )
}
