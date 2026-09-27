import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import { App } from './App'

// En desarrollo, MSW simula la API salvo que se apague con VITE_API_MOCKS=false.
// Si el registro falla, la app igual se renderiza y las llamadas van al backend real.
async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCKS === 'false') return
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
