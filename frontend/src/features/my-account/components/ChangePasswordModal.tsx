import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { modalStyles } from '@/styles/ui'
import { useMyProfile } from '../api/my-account.queries'
import { ChangePasswordForm } from './ChangePasswordForm'

type ChangePasswordModalProps = {
  email: string
  /** "Ahora no", la cruz o Escape: se cierra y vuelve en el próximo ingreso (P2). */
  onPostpone: () => void
}

/**
 * Ventana "Cambiá tu contraseña" (§3.11.3): se abre encima de todo mientras el
 * cliente cargado en caja tenga mustChangePassword. Al cambiarla, la sesión
 * pasa a mustChangePassword = false y la ventana no vuelve a aparecer.
 */
export function ChangePasswordModal({ email, onPostpone }: ChangePasswordModalProps) {
  // Solo para avisar antes de enviar si la nueva es el documento; si no llegó, lo valida el backend
  const profile = useMyProfile()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onPostpone()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onPostpone])

  return createPortal(
    <div
      className={modalStyles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      aria-describedby="change-password-description"
    >
      <div className={cn(modalStyles.panel, 'relative max-w-md overflow-y-auto p-6 sm:p-8')}>
        <button
          type="button"
          onClick={onPostpone}
          aria-label="Cerrar"
          title="Cerrar"
          className={modalStyles.closeIcon}
        >
          <Icon d={ICONS.close} className="size-5" />
        </button>
        <h3 id="change-password-title" className="pr-10 text-2xl leading-tight text-accent-800">
          Cambiá tu contraseña
        </h3>
        <p id="change-password-description" className="mt-3 mb-6">
          Por seguridad, cambiá la contraseña que te dio el restaurante (tu número de
          documento) por una propia.
        </p>

        <ChangePasswordForm
          idPrefix="required-password"
          email={email}
          documentNumber={profile.data?.documentNumber}
          hints={{ currentPassword: 'Es tu número de documento, sin puntos.' }}
          secondaryAction={
            <Button type="button" variant="secondary" onClick={onPostpone}>
              Ahora no
            </Button>
          }
        />
      </div>
    </div>,
    document.body,
  )
}
