// Barrel del feature auth: lo único que otros módulos deben importar.
export { LoginPage } from './pages/LoginPage'
export { RegisterPage } from './pages/RegisterPage'
export { SessionActions } from './components/SessionActions'
export { restoreSession, useSession, type Session } from './session'
export type { AuthResponse, AuthUser } from './types/auth'
export type { RegisterCustomerBody } from './types/register'
