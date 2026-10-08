import axios, { type InternalAxiosRequestConfig } from 'axios'

// Relativa: en desarrollo la resuelve el proxy de Vite (vite.config.ts) y en
// producción un rewrite hacia el backend. Así la cookie del refresh es del
// mismo sitio que el front.
export const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export const http = axios.create({
  baseURL: API_URL,
  // Holgado: el backend en Render tarda en despertar después de un rato sin uso
  timeout: 30_000,
  withCredentials: true, // refresh token en cookie httpOnly
})

/** Lo que el cliente HTTP necesita de la sesión; lo provee features/auth. */
type SessionHooks = {
  getAccessToken: () => string | null
  /** Renueva la sesión; devuelve false si no se pudo. */
  renewSession: () => Promise<boolean>
}

let session: SessionHooks | null = null

export function connectSession(hooks: SessionHooks) {
  session = hooks
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

// /auth/* se maneja aparte: login, refresh y logout no llevan token ni se reintentan
const isAuthRequest = (config: InternalAxiosRequestConfig) =>
  config.url?.startsWith('/auth/') ?? false

http.interceptors.request.use((config) => {
  const token = session?.getAccessToken()
  if (token && !isAuthRequest(config)) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Ante un 401 UNAUTHENTICATED (token vencido) renueva la sesión y repite el
// pedido una sola vez. Un 403 FORBIDDEN no se renueva: no es falta de sesión.
http.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || !error.config || !session) throw error

  const config: RetriableConfig = error.config
  const { status, data } = error.response ?? {}
  const unauthenticated =
    status === 401 && (data as { code?: string } | undefined)?.code === 'UNAUTHENTICATED'

  if (!unauthenticated || config._retried || isAuthRequest(config)) throw error

  config._retried = true
  if (!(await session.renewSession())) throw error
  return http(config)
})
