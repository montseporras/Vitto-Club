import { Outlet } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { AppFooter, AppHeader } from '@/shared/components/navigation/AppHeader'
import { SideNav, type SideNavItem } from '@/shared/components/navigation/SideNav'
import { ICONS } from '@/shared/components/ui/icons'

// Botones grandes, uno abajo del otro: cómodos de tocar en el mostrador (RNF-1, RNF-2).
const NAV: SideNavItem[] = [
  { id: 'cliente', to: PATHS.caja.cliente, label: 'Cliente', icon: ICONS.user },
  {
    id: 'canje',
    to: PATHS.caja.canje,
    label: 'Gestionar canje por código',
    icon: ICONS.ticket,
  },
  {
    id: 'alta',
    to: PATHS.caja.altaCliente,
    label: 'Alta manual de cliente',
    icon: ICONS.userPlus,
  },
]

export function CajeroLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader area="Mostrador" />

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
