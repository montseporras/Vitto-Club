import { Link, Outlet } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { SessionActions, useSession } from '@/features/auth'
import { AppFooter, AppHeader } from '@/shared/components/navigation/AppHeader'
import { SideNav, type SideNavItem } from '@/shared/components/navigation/SideNav'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { appHeaderStyles } from '@/styles/ui'

// Botones grandes, uno abajo del otro: cómodos de tocar en el mostrador (RNF-1, RNF-2).
const NAV: SideNavItem[] = [
  {
    id: 'customer',
    to: PATHS.cashier.customer,
    label: 'Buscar clientes',
    icon: ICONS.user,
  },
  {
    id: 'registration',
    to: PATHS.cashier.newCustomer,
    label: 'Nuevo cliente',
    icon: ICONS.userPlus,
  },
  {
    id: 'redemption',
    to: PATHS.cashier.redemption,
    label: 'Gestionar canje por código',
    icon: ICONS.ticket,
  },
]

export function CashierLayout() {
  const session = useSession()

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader area="Mostrador">
        {/* El Administrador entra al mostrador desde su panel: acceso directo para volver */}
        {session.user?.role === 'ADMIN' && (
          <Link to={PATHS.admin.root} className={appHeaderStyles.action}>
            <Icon d={ICONS.settings} className="size-4" />
            Panel
          </Link>
        )}
        <SessionActions />
      </AppHeader>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8 lg:py-8">
        <aside className="lg:shrink-0">
          {/* En pantallas chicas el menú va arriba y siempre expandido */}
          <SideNav
            label="Opciones del mostrador"
            items={NAV}
            storageKey="vitto:menu-caja"
            collapsibleFrom="(min-width: 64rem)"
            className="lg:sticky lg:top-24"
          />
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <AppFooter />
    </div>
  )
}
