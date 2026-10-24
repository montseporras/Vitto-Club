import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { PATHS } from '@/app/router/paths'
import logoIso from '@/assets/logo-vitto-iso-white.png'
import { useSession } from '@/features/auth'
import { ChangePasswordModal } from '@/features/my-account'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { appHeaderStyles, bottomNavStyles } from '@/styles/ui'

const TABS = [
  { label: 'Inicio', to: PATHS.customer.root },
  { label: 'Historial', to: PATHS.customer.history },
] as const

// Misiones y Canjes son de los Sprints 4 y 5: se ven, pero "Próximamente"
const SOON_TABS = ['Misiones', 'Canjes'] as const

/**
 * Vista del Cliente, para celular (contrato §3.10): barra superior "Vitto Club"
 * con el ícono de perfil, y barra inferior fija con las pestañas.
 */
export function CustomerLayout() {
  const session = useSession()
  // "Ahora no" posterga la ventana hasta el próximo ingreso (login o recarga):
  // por eso vive en memoria y no se guarda (P2)
  const [passwordChangePostponed, setPasswordChangePostponed] = useState(false)

  const user = session.status === 'authenticated' ? session.user : null

  return (
    <div className="flex min-h-svh flex-col">
      <header className={appHeaderStyles.root}>
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-2.5">
          <div className={appHeaderStyles.brand}>
            <img src={logoIso} alt="" width={171} height={225} className={appHeaderStyles.logo} />
            <h1 className={appHeaderStyles.title}>Vitto Club</h1>
          </div>
          <Link
            to={PATHS.customer.profile}
            aria-label="Mi perfil"
            title="Mi perfil"
            className={appHeaderStyles.iconButton}
          >
            <Icon d={ICONS.user} className="size-5" />
          </Link>
        </div>
      </header>

      <main className="w-full flex-1 px-4 pt-6 pb-28">
        <Outlet />
      </main>

      <nav aria-label="Secciones" className={bottomNavStyles.root}>
        <ul className={bottomNavStyles.list}>
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end
                className={({ isActive }) =>
                  cn(
                    bottomNavStyles.item,
                    isActive ? bottomNavStyles.itemActive : bottomNavStyles.itemIdle,
                  )
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
          {SOON_TABS.map((label) => (
            <li key={label}>
              <span
                aria-disabled="true"
                title="Próximamente"
                className={cn(bottomNavStyles.item, bottomNavStyles.itemSoon)}
              >
                {label}
                <span className={bottomNavStyles.soon}>Próx.</span>
              </span>
            </li>
          ))}
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
