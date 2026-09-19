import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import { App } from './App'

// En desarrollo, MSW simula la API salvo que se apague con VITE_API_MOCKS=false.
async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCKS === 'false') return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
