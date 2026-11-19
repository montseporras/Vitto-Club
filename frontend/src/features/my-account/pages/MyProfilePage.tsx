// Mi perfil del Cliente (diseño V2): foto, nombre y mail, y un menú que abre cada sección:
// Mis datos, Mi nivel, Notificaciones y Ayuda. Al final, "Cerrar sesión".
import { useState } from 'react'
import { Link } from 'react-router'
import { LogoutDialog } from '@/features/auth'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { useMyProfile } from '../api/my-account.queries'
import { ClientPageHeader } from '../components/client/ClientUI'
import { CUSTOMER_PATHS } from '../lib/paths'

const MENU = [
  { label: 'Mis datos', to: CUSTOMER_PATHS.profileData, icon: ICONS.user },
  { label: 'Mi nivel', to: CUSTOMER_PATHS.profileLevel, icon: ICONS.star },
  { label: 'Notificaciones', to: CUSTOMER_PATHS.profileNotifications, icon: ICONS.bell },
  { label: 'Ayuda', to: CUSTOMER_PATHS.profileHelp, icon: ICONS.help },
] as const

const menuItem = cn(
  clientStyles.card,
  'flex min-h-16 w-full items-center gap-4 px-5 text-left text-lg font-semibold transition-[transform,box-shadow,background-color] duration-150',
  'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
)

export function MyProfilePage() {
  const profile = useMyProfile()
  const [confirmingLogout, setConfirmingLogout] = useState(false)

  return (
    <div className={cn(clientStyles.page, 'md:max-w-xl lg:max-w-xl')}>
      <ClientPageHeader title="Mi perfil" />

      <div className="grid justify-items-center gap-1 text-center">
        <span
          aria-hidden="true"
          className="mb-2 grid size-28 place-items-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-lg shadow-accent-800/25 ring-4 ring-white"
        >
          <Icon d={ICONS.user} className="size-14" />
        </span>
        {profile.isPending ? (
          <StatusText>Cargando…</StatusText>
        ) : profile.isError ? (
          <Alert variant="error">{profile.error.message}</Alert>
        ) : (
          <>
            <p className="font-heading text-2xl font-bold text-ink">
              {profile.data.firstName} {profile.data.lastName}
            </p>
            <p className="text-neutral-600">{profile.data.email}</p>
          </>
        )}
      </div>

      <nav aria-label="Mi perfil">
        <ul className="grid gap-3">
          {MENU.map((item) => (
            <li key={item.to}>
              <Link to={item.to} className={cn(menuItem, 'group text-ink')}>
                <Icon d={item.icon} className="size-6 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <Icon
                  d={ICONS.chevronRight}
                  className="size-5 text-neutral-500 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setConfirmingLogout(true)}
              className={cn(menuItem, 'cursor-pointer text-negative hover:bg-[#fdecea]')}
            >
              <Icon d={ICONS.logOut} className="size-6 shrink-0" />
              Cerrar sesión
            </button>
          </li>
        </ul>
      </nav>

      {confirmingLogout && <LogoutDialog onCancel={() => setConfirmingLogout(false)} />}
    </div>
  )
}
