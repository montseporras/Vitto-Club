// Interruptor "Activa" / "Desactivada" de cada mensaje automático (US-14, CA-14.3), como el del
// prototipo (ConfigNotificaciones.html). Vive en el feature: no hay uno compartido.
import { cn } from '@/shared/lib/utils'

type ActiveSwitchProps = {
  checked: boolean
  // Nombre accesible, como el prototipo: "Activar Cumpleaños"
  label: string
  onChange: (checked: boolean) => void
}

export function ActiveSwitch({ checked, label, onChange }: ActiveSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-sm font-semibold',
        checked ? 'text-[#7e3e20]' : 'text-[#7a6e63]',
      )}
    >
      <span
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-[#a8532a]' : 'bg-[#d8cfc6]',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] size-[18px] rounded-full bg-white shadow transition-[left]',
            checked ? 'left-[23px]' : 'left-[3px]',
          )}
        />
      </span>
      <span className="min-w-[86px] text-left">{checked ? 'Activa' : 'Desactivada'}</span>
    </button>
  )
}
