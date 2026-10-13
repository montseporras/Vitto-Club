import { NavLink } from 'react-router'
import { cn } from '@/shared/lib/utils'
import { tabsStyles } from '@/styles/ui'

// Mismas rutas que PATHS.login y PATHS.register (un feature no puede importar de app/)
const TABS = [
  { to: '/login', label: 'Ingresar' },
  { to: '/registro', label: 'Registrarme' },
]

/** Pestañas Ingresar / Registrarme: van dentro de la tarjeta de cada pantalla de acceso. */
export function AuthTabs() {
  return (
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
  )
}
