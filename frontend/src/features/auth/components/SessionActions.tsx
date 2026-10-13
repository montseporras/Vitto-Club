import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ROLES } from '@/domain/roles'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { appHeaderStyles, modalStyles } from '@/styles/ui'
import { useLogout } from '../api/auth.queries'
import { useSession } from '../session'

/** Usuario de la sesión y botón para cerrarla, en la barra superior. */
export function SessionActions() {
  const session = useSession()
  const logout = useLogout()
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
        disabled={logout.isPending}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className={appHeaderStyles.action}
      >
        <Icon d={ICONS.logOut} className="size-4" />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>

      {/* Portal: el header es sticky y no debe recortar ni tapar el diálogo */}
      {confirming &&
        createPortal(
          <div
            className={modalStyles.overlay}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-description"
          >
            <div className={cn(modalStyles.panel, 'max-w-md p-6 sm:p-8')}>
              <h3
                id="logout-title"
                className="text-2xl leading-tight text-accent-800"
              >
                ¿Cerrar sesión?
              </h3>
              <p id="logout-description" className="mt-3">
                ¿Estás seguro de que querés cerrar sesión? Vas a volver a la
                pantalla de ingreso.
              </p>
              <div className="mt-6 flex flex-wrap justify-end gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  autoFocus
                  onClick={() => setConfirming(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                >
                  {logout.isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
