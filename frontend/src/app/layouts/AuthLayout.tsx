import { Outlet } from 'react-router'
import { AppFooter, AppHeader } from '@/shared/components/navigation/AppHeader'

/**
 * Layout de las vistas de acceso (ingreso y registro). En pantallas grandes ocupa
 * exactamente el alto de la ventana y solo se desplaza el formulario.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col md:h-svh md:overflow-hidden">
      <AppHeader area="Ingreso" showBack={false} />

      <main className="flex w-full flex-1 md:min-h-0">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  )
}
