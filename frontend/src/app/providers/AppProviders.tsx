import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { restoreSession } from '@/features/auth'
import { queryClient } from '@/shared/api/queryClient'

// Cuando exista, se suma ToastProvider (ver doc de estructura, sección 05).
export function AppProviders({ children }: { children: ReactNode }) {
  // Al cargar la app, recupera la sesión con la cookie del refresh
  useEffect(restoreSession, [])

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
