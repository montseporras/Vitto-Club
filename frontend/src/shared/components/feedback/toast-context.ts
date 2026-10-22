import { createContext } from 'react'

export type ShowToast = (message: string) => void

/** Lo provee ToastProvider; se usa con useToast. */
export const ToastContext = createContext<ShowToast | null>(null)
