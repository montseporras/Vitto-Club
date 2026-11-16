import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { PATHS } from '@/app/router/paths'
import logoIso from '@/assets/logo-vitto-iso-white.png'
import { useSession } from '@/features/auth'
import { ChangePasswordModal } from '@/features/my-account'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { appHeaderStyles, clientNavStyles } from '@/styles/ui'

type Tab = {
  label: string
  to: string
  icon: string
  /** Rutas que también marcan la pestaña como activa (ej. el Historial está dentro de Mis canjes) */
  matches: string[]
}

// Las cuatro secciones del Cliente, en el orden del diseño V2
const TABS: Tab[] = [
  { label: 'Inicio', to: PATHS.customer.root, icon: ICONS.home, matches: [`${PATHS.customer.root}/promos`] },
  {
    label: 'Mis canjes',
    to: PATHS.customer.redemptions,
    icon: ICONS.ticket,
    matches: [PATHS.customer.history, PATHS.customer.missions],
  },
  { label: 'Recompensas', to: PATHS.customer.rewards, icon: ICONS.gift, matches: [] },
  { label: 'Mi perfil', to: PATHS.customer.profile, icon: ICONS.user, matches: [] },
]

function isTabActive(tab: Tab, pathname: string) {
  if (tab.to === PATHS.customer.root) {
    return pathname === tab.to || pathname === `${tab.to}/` || tab.matches.some((path) => pathname.startsWith(path))
  }
  return [tab.to, ...tab.matches].some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/**
 * Vista del Cliente (diseño "App Fidelización V2"). En el celular, cada pantalla lleva su título y
 * las cuatro secciones van en la barra fija de abajo. Desde tablet, las mismas secciones pasan a la
 * barra naranja de arriba, junto a la marca.
 */
export function CustomerLayout() {
  const session = useSession()
  const { pathname } = useLocation()
  // "Ahora no" posterga la ventana hasta el próximo ingreso (login o recarga):
  // por eso vive en memoria y no se guarda (P2)
  const [passwordChangePostponed, setPasswordChangePostponed] = useState(false)

  const user = session.status === 'authenticated' ? session.user : null

  return (
    <div className="flex min-h-svh flex-col">
      {/* Tablet y compu: marca y secciones arriba */}
      <header className={clientNavStyles.top}>
        <div className={clientNavStyles.topInner}>
          <Link to={PATHS.customer.root} className={appHeaderStyles.brand}>
            <img src={logoIso} alt="" width={171} height={225} className={appHeaderStyles.logo} />
            <span className={cn(appHeaderStyles.title, 'font-heading')}>Vitto Club</span>
          </Link>
          <nav aria-label="Secciones" className="ml-auto">
            <ul className={clientNavStyles.topList}>
              {TABS.map((tab) => {
                const active = isTabActive(tab, pathname)
                return (
                  <li key={tab.to}>
                    <NavLink
                      to={tab.to}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        clientNavStyles.topItem,
                        active ? clientNavStyles.topActive : clientNavStyles.topIdle,
                      )}
                    >
                      <Icon d={tab.icon} className="size-4.5" />
                      {tab.label}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </header>

      <main className="w-full flex-1 px-4 pt-6 pb-32 md:px-6 md:pt-8 md:pb-12">
        <Outlet />
      </main>

      {/* Celular: barra fija abajo con las cuatro secciones */}
      <nav aria-label="Secciones" className={clientNavStyles.bottom}>
        <ul className={clientNavStyles.bottomList}>
          {TABS.map((tab) => {
            const active = isTabActive(tab, pathname)
            return (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    clientNavStyles.bottomItem,
                    active ? clientNavStyles.bottomActive : clientNavStyles.bottomIdle,
                  )}
                >
                  <Icon d={tab.icon} className={cn('size-6', active && 'stroke-[2.4]')} />
                  <span className={cn(active && 'font-bold')}>{tab.label}</span>
                  {active && <span aria-hidden="true" className={clientNavStyles.indicator} />}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {user?.mustChangePassword && !passwordChangePostponed && (
        <ChangePasswordModal
          email={user.email}
          onPostpone={() => setPasswordChangePostponed(true)}
        />
      )}
    </div>
  )
}
