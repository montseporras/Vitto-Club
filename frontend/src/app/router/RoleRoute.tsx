import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import type { Role } from '@/domain/roles'
import { ProtectedRoute } from './ProtectedRoute'

type RoleRouteProps = {
  allowed: Role[]
  children: ReactNode
}

/**
 * Ruta por rol: exige sesión y que el rol sea uno de los permitidos. Con otro
 * rol vuelve a "/", que lo manda a su propia pantalla. Solo ordena la
 * navegación: la seguridad real la pone el backend con el 403.
 */
export function RoleRoute({ allowed, children }: RoleRouteProps) {
  return (
    <ProtectedRoute>
      {(user) =>
        allowed.includes(user.role) ? children : <Navigate to="/" replace />
      }
    </ProtectedRoute>
  )
}
