import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useSession, type AuthUser } from '@/features/auth'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { PATHS } from './paths'

type ProtectedRouteProps = {
  /** Recibe el usuario de la sesión. */
  children: (user: AuthUser) => ReactNode
}

/** Ruta protegida: exige sesión. Sin sesión, va al login y después vuelve acá. */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const session = useSession()
  const location = useLocation()

  if (session.status === 'restoring') {
    return (
      <div className="grid min-h-svh place-items-center">
        <StatusText>Cargando…</StatusText>
      </div>
    )
  }

  if (session.status === 'anonymous') {
    return (
      <Navigate
        to={PATHS.login}
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  return children(session.user)
}
