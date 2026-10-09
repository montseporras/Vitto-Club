// Sesión del usuario: el access token vive solo en memoria (nunca en
// localStorage). Al recargar la página se pierde y se recupera con refresh,
// que usa la cookie httpOnly. Ver docs/auth-api.md del backend.
import { useSyncExternalStore } from 'react'
import { ApiError } from '@/shared/api/ApiError'
import { connectSession } from '@/shared/api/http'
import { queryClient } from '@/shared/api/queryClient'
import { refresh } from './api/auth.api'
import type { AuthResponse, AuthUser } from './types/auth'

export type Session =
  // Al cargar la app, mientras se intenta recuperar la sesión
  | { status: 'restoring'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: AuthUser }

let accessToken: string | null = null
let session: Session = { status: 'restoring', user: null }
const listeners = new Set<() => void>()

function setSession(next: Session) {
  session = next
  listeners.forEach((listener) => listener())
}

export const getAccessToken = () => accessToken

export function startSession(response: AuthResponse) {
  accessToken = response.accessToken
  setSession({ status: 'authenticated', user: response.user })
}

/** Cierra la sesión en el front y descarta los datos cacheados del usuario anterior. */
export function endSession() {
  accessToken = null
  queryClient.clear()
  setSession({ status: 'anonymous', user: null })
}

let renewing: Promise<boolean> | null = null

/**
 * Renueva la sesión con la cookie. Un solo refresh a la vez: si varios pedidos
 * lo necesitan juntos, esperan el mismo resultado (la cookie se usa una vez).
 * Nunca se llama con un temporizador: solo al cargar o ante un 401.
 */
export function renewSession(): Promise<boolean> {
  renewing ??= tryRefresh().finally(() => {
    renewing = null
  })
  return renewing
}

async function tryRefresh() {
  // Un segundo intento: otra pestaña pudo haber dejado una cookie nueva
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      startSession(await refresh())
      return true
    } catch (error) {
      // Sin conexión con el servidor no tiene sentido reintentar
      if (!(error instanceof ApiError) || error.status === undefined) break
    }
  }
  endSession()
  return false
}

/** Recupera la sesión al cargar la app; no hace nada si ya se resolvió. */
export function restoreSession() {
  if (session.status === 'restoring') void renewSession()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useSession = () => useSyncExternalStore(subscribe, () => session)

connectSession({ getAccessToken, renewSession })
