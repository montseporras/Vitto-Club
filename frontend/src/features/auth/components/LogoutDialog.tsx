import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { modalStyles } from '@/styles/ui'
import { useLogout } from '../api/auth.queries'

type LogoutDialogProps = {
  onCancel: () => void
}

/**
 * Confirmación de cierre de sesión, la misma para los tres roles (contrato
 * §3.10.5). Si la llamada falla, la sesión se cierra igual en el front.
 */
export function LogoutDialog({ onCancel }: LogoutDialogProps) {
  const logout = useLogout()

  // Escape cancela, como en el resto de los modales
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  // Portal: el header es sticky y no debe recortar ni tapar el diálogo
  return createPortal(
    <div
      className={modalStyles.overlay}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="logout-title"
      aria-describedby="logout-description"
    >
      <div className={cn(modalStyles.panel, 'relative max-w-md p-6 sm:p-8')}>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cerrar"
          title="Cerrar"
          className={modalStyles.closeIcon}
        >
          <Icon d={ICONS.close} className="size-5" />
        </button>
        <h3 id="logout-title" className="text-2xl leading-tight text-accent-800">
          ¿Querés cerrar sesión?
        </h3>
        <p id="logout-description" className="mt-3">
          Vas a salir de tu cuenta y volver a la pantalla de ingreso.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2.5">
          <Button type="button" variant="secondary" autoFocus onClick={onCancel}>
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
  )
}
