import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { toastStyles } from '@/styles/ui'
import { ToastContext, type ShowToast, type ToastOptions } from './toast-context'

// Cuánto queda a la vista un aviso (igual que en el prototipo)
const TOAST_DURATION_MS = 3500

type ToastState = { id: number; message: string; options?: ToastOptions }

/** Avisos breves de confirmación (ej. "Datos actualizados"), uno a la vez. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const counter = useRef(0)

  const show = useCallback<ShowToast>((message, options) => {
    clearTimeout(timer.current)
    counter.current += 1
    setToast({ id: counter.current, message, options })
    timer.current = setTimeout(() => setToast(null), options?.duration ?? TOAST_DURATION_MS)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  const action = toast?.options?.action
  const duration = toast?.options?.duration ?? TOAST_DURATION_MS

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* La región existe siempre: así los lectores de pantalla anuncian cada aviso */}
      {createPortal(
        <div role="status" aria-live="polite" className={toastStyles.region}>
          {toast && (
            <div key={toast.id} className={toastStyles.toast}>
              <Icon d={ICONS.check} className={toastStyles.icon} />
              <span>{toast.message}</span>
              {action && (
                <button
                  type="button"
                  className={toastStyles.action}
                  onClick={() => {
                    clearTimeout(timer.current)
                    setToast(null)
                    action.onClick()
                  }}
                >
                  <Icon d={ICONS.undo} className="size-4" />
                  {action.label}
                </button>
              )}
              {/* Barra que se vacía: muestra cuánto tiempo queda para deshacer */}
              {action && (
                <span
                  aria-hidden="true"
                  className={toastStyles.countdown}
                  style={{ animationDuration: `${duration}ms` }}
                />
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
