import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MOCKS_ENABLED } from '@/shared/lib/env'
import '@/styles/globals.css'
import { App } from './App'

// Si el registro de MSW falla, la app igual se renderiza y las llamadas van al backend real.
async function enableMocking() {
  if (!MOCKS_ENABLED) return
  try {
    const { worker } = await import('@/mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  } catch (error) {
    console.error('[MSW] No se pudo iniciar el mock:', error)
  }
}

void enableMocking().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
