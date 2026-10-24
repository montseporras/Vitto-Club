import { useState } from 'react'
import { ROLES } from '@/domain/roles'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { appHeaderStyles } from '@/styles/ui'
import { useSession } from '../session'
import { LogoutDialog } from './LogoutDialog'

/** Usuario de la sesión y botón para cerrarla, en la barra superior. */
export function SessionActions() {
  const session = useSession()
  const [confirming, setConfirming] = useState(false)

  if (session.status !== 'authenticated') return null

  const { user } = session
  // Hasta que el login devuelva el nombre, se muestra el mail
  const name =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email

  return (
    <>
      <span className={appHeaderStyles.meta}>
        {name} · {ROLES[user.role]}
      </span>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className={appHeaderStyles.action}
      >
        <Icon d={ICONS.logOut} className="size-4" />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>

      {confirming && <LogoutDialog onCancel={() => setConfirming(false)} />}
    </>
  )
}
