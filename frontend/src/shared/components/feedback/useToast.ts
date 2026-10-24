import { useContext } from 'react'
import { ToastContext, type ShowToast } from './toast-context'

/** Muestra un aviso breve. Requiere estar dentro de ToastProvider. */
export function useToast(): ShowToast {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast tiene que usarse dentro de ToastProvider')
  return show
}
