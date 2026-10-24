import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { restoreSession } from '@/features/auth'
import { queryClient } from '@/shared/api/queryClient'
import { ToastProvider } from '@/shared/components/feedback/Toast'

export function AppProviders({ children }: { children: ReactNode }) {
  // Al cargar la app, recupera la sesión con la cookie del refresh
  useEffect(restoreSession, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  )
}
