import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/globals.css'
import App from './App.tsx'

// Mientras el backend (NestJS) no esté disponible, arrancamos MSW para
// interceptar las llamadas y devolver respuestas simuladas. Si el registro
// falla, la app igual se renderiza (las llamadas irán al backend real).
async function enableMocking() {
  if (!import.meta.env.DEV) return
  try {
    const { worker } = await import('../mocks/browser')
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
