import { cn } from '@/shared/lib/utils'
import { switchStyles } from '@/styles/ui'

type SwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Nombre accesible (ej. "Activar Cumpleaños"). */
  label: string
  /** Texto a la derecha según el estado. Si no se pasan, no se muestra texto. */
  onText?: string
  offText?: string
  /** El cambio se está guardando: no acepta otro toque. */
  pending?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Interruptor de dos estados (encendido / apagado). El cambio se aplica al instante: no hace falta
 * un botón "Guardar".
 */
export function Switch({
  checked,
  onChange,
  label,
  onText,
  offText,
  pending,
  disabled,
  className,
}: SwitchProps) {
  const text = checked ? onText : offText
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      onClick={() => onChange(!checked)}
      className={cn(switchStyles.root, checked ? switchStyles.textOn : switchStyles.textOff, className)}
    >
      <span className={cn(switchStyles.track, checked ? switchStyles.trackOn : switchStyles.trackOff)}>
        <span className={cn(switchStyles.thumb, checked ? switchStyles.thumbOn : switchStyles.thumbOff)}>
          {pending && <span aria-hidden="true" className={switchStyles.spinner} />}
        </span>
      </span>
      {text && <span className={switchStyles.text}>{text}</span>}
    </button>
  )
}
