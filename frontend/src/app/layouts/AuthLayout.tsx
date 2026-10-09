import { Outlet } from 'react-router'
import { AppFooter, AppHeader } from '@/shared/components/navigation/AppHeader'

/** Layout de las vistas de acceso (login y, más adelante, registro). */
export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader area="Ingreso" showBack={false} />

      <main className="w-full flex-1 px-4 py-8 lg:py-12">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  )
}
