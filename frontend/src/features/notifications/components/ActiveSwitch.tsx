// Interruptor "Activa" / "Desactivada" de cada mensaje automático (US-14, CA-14.3). Usa el
// interruptor compartido, para que todos los de la app se vean igual.
import { Switch } from '@/shared/components/ui/Switch'

type ActiveSwitchProps = {
  checked: boolean
  // Nombre accesible, como el prototipo: "Activar Cumpleaños"
  label: string
  onChange: (checked: boolean) => void
}

export function ActiveSwitch({ checked, label, onChange }: ActiveSwitchProps) {
  return <Switch checked={checked} onChange={onChange} label={label} onText="Activa" offText="Desactivada" />
}
