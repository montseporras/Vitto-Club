import { NavLink, Outlet } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { SessionActions } from '@/features/auth'
import { AppHeader } from '@/shared/components/navigation/AppHeader'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { appHeaderStyles } from '@/styles/ui'

// Marco de la vista del Cliente (contrato §3.10): para celular, con el ícono de perfil arriba y
// la barra de pestañas fija abajo. Cada pestaña muestra su pantalla en el <Outlet />.

const tabStyles =
  'flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2.5 font-heading text-xs font-extrabold'

/** Pestaña que todavía no tiene pantalla: se ve, pero no se puede tocar. */
function DisabledTab({ label, comingSoon }: { label: string; comingSoon?: boolean }) {
  return (
    <button
      type="button"
      disabled
      title={comingSoon ? 'Próximamente' : undefined}
      className={cn(tabStyles, 'cursor-default text-text opacity-50')}
    >
      <span>{label}</span>
      {comingSoon && (
        <span className="font-sans text-[0.5rem] font-bold uppercase tracking-[0.06em] text-accent-700">
          Próx.
        </span>
      )}
    </button>
  )
}

export function CustomerLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader area="Mi cuenta" showBack={false}>
        {/* Mi perfil es de otra historia (PERFIL): el ícono queda deshabilitado hasta entonces */}
        <button
          type="button"
          disabled
          aria-label="Mi perfil"
          title="Mi perfil"
          className={cn(appHeaderStyles.iconButton, 'disabled:cursor-default disabled:opacity-60')}
        >
          <Icon d={ICONS.user} className="size-5" />
        </button>
        {/* Se mantiene hasta que "Cerrar sesión" esté en Mi perfil (§3.10.5) */}
        <SessionActions />
      </AppHeader>

      {/* pb-24: deja lugar para la barra fija de abajo */}
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-24">
        <Outlet />
      </main>

      <nav
        aria-label="Secciones de mi cuenta"
        className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-accent-200 bg-bg pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-md">
          <NavLink
            to={PATHS.customer.root}
            end
            className={({ isActive }) =>
              cn(tabStyles, isActive ? 'bg-accent text-bg' : 'text-text')
            }
          >
            Inicio
          </NavLink>
          <NavLink
            to={PATHS.customer.history}
            className={({ isActive }) =>
              cn(tabStyles, isActive ? 'bg-accent text-bg' : 'text-text')
            }
          >
            Historial
          </NavLink>
          <DisabledTab label="Misiones" comingSoon />
          <DisabledTab label="Canjes" comingSoon />
        </div>
      </nav>
    </div>
  )
}
