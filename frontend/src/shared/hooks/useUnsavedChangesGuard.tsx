import { useCallback, useRef, useState } from 'react'
import { UnsavedChangesDialog } from '@/shared/components/feedback/UnsavedChangesDialog'

/**
 * Protege el cierre de una edición: si hay cambios sin guardar, en lugar de cerrar muestra el
 * aviso "Tenés cambios sin guardar" con "Volver a la edición" y "Salir sin guardar".
 *
 * Uso: `const { guard, dialog } = useUnsavedChangesGuard(isDirty)`, después
 * `onClose={guard(onClose)}` en la cruz, en "Cancelar" y en Escape, y `{dialog}` en el JSX.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const [leave, setLeave] = useState<(() => void) | null>(null)
  // Mientras se muestra el aviso, otro intento de cerrar (ej. Escape del modal de abajo) no hace nada
  const asking = useRef(false)

  const guard = useCallback(
    (close: () => void) => () => {
      if (asking.current) return
      if (!dirty) {
        close()
        return
      }
      asking.current = true
      setLeave(() => close)
    },
    [dirty],
  )

  const stay = () => {
    asking.current = false
    setLeave(null)
  }

  const dialog = leave ? (
    <UnsavedChangesDialog
      onStay={stay}
      onLeave={() => {
        stay()
        leave()
      }}
    />
  ) : null

  return { guard, dialog, asking: leave !== null }
}
