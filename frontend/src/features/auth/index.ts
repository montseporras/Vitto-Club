// Barrel del feature auth: lo único que otros módulos deben importar.
export { LoginPage } from './pages/LoginPage'
export { SessionActions } from './components/SessionActions'
export { restoreSession, useSession, type Session } from './session'
export type { AuthResponse, AuthUser } from './types/auth'
