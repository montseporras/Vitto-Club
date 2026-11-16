import { createContext } from 'react'

export type ToastOptions = {
  /** Botón dentro del aviso (ej. "Deshacer"). Al tocarlo, el aviso se cierra. */
  action?: { label: string; onClick: () => void }
  /** Cuánto queda a la vista, en ms. Por defecto, 3,5 s. */
  duration?: number
}

export type ShowToast = (message: string, options?: ToastOptions) => void

/** Lo provee ToastProvider; se usa con useToast. */
export const ToastContext = createContext<ShowToast | null>(null)
