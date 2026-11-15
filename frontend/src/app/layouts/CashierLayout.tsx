import { Link, Outlet } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { SessionActions, useSession } from '@/features/auth'
import { AppHeader } from '@/shared/components/navigation/AppHeader'
import { SideNav, type SideNavItem } from '@/shared/components/navigation/SideNav'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { appHeaderStyles } from '@/styles/ui'

// Botones grandes, uno abajo del otro: cómodos de tocar en el mostrador (RNF-1, RNF-2).
const NAV: SideNavItem[] = [
  {
    id: 'customer',
    to: PATHS.cashier.customer,
    label: 'Buscar cliente',
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
    label: 'Canjes por código',
    icon: ICONS.scan,
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

      {/* A todo el ancho: el menú queda pegado a la izquierda con un margen chico y
          el contenido se centra en el espacio que sobra */}
      <div className="flex w-full flex-1 gap-3 px-4 py-6 sm:gap-5 sm:px-6 lg:gap-8 lg:py-8">
        <aside className="shrink-0">
          {/* En pantallas chicas el menú va arriba y siempre expandido */}
          <SideNav
            label="Opciones del mostrador"
            title="Menú de mostrador"
            items={NAV}
            storageKey="vitto:menu-caja"
            collapsibleFrom="(min-width: 64rem)"
            className="sticky top-24"
          />
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

    </div>
  )
}
