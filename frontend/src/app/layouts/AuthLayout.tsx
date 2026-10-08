// Layout de las pantallas de acceso (/login y /registro): una tarjeta centrada con las pestañas Ingresar / Registrarme.
import { NavLink, Outlet, useLocation } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { AppFooter, AppHeader } from '@/shared/components/navigation/AppHeader'
import { Page, PageCard } from '@/shared/components/ui/Page'
import { cn } from '@/shared/lib/utils'
import { tabsStyles } from '@/styles/ui'

const TABS = [
  {
    to: PATHS.auth.login,
    label: 'Ingresar',
    description:
      '¡Gracias por ser parte del Club La Vitto!',
  },
  {
    to: PATHS.auth.register,
    label: 'Registrarme',
    description:
      'Creá tu cuenta para sumarte al programa y canjear puntos por recompensas',
  },
]

export function AuthLayout() {
  const { pathname } = useLocation()
  const current = TABS.find((tab) => tab.to === pathname) ?? TABS[0]

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader area="Ingreso" showBack={false} />

      <main className="flex-1 px-4 py-6 lg:py-10">
        <Page className="max-w-5xl">
          <PageCard
            eyebrow="Vitto Club"
            title={current.label}
            description={current.description}
          >
            <nav aria-label="Acceso" className={tabsStyles.root}>
              {TABS.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    cn(
                      tabsStyles.item,
                      isActive ? tabsStyles.itemActive : tabsStyles.itemIdle,
                    )
                  }
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>

            <Outlet />
          </PageCard>
        </Page>
      </main>

      <AppFooter />
    </div>
  )
}
