import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { toastStyles } from '@/styles/ui'
import { ToastContext, type ShowToast } from './toast-context'

// Cuánto queda a la vista un aviso (igual que en el prototipo)
const TOAST_DURATION_MS = 3500

/** Avisos breves de confirmación (ej. "Datos actualizados"), uno a la vez. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback<ShowToast>((next) => {
    clearTimeout(timer.current)
    setMessage(next)
    timer.current = setTimeout(() => setMessage(null), TOAST_DURATION_MS)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* La región existe siempre: así los lectores de pantalla anuncian cada aviso */}
      {createPortal(
        <div role="status" aria-live="polite" className={toastStyles.region}>
          {message && (
            <div className={toastStyles.toast}>
              <Icon d={ICONS.check} className={toastStyles.icon} />
              {message}
            </div>
          )}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
