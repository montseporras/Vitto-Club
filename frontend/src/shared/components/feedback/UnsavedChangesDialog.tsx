import { createPortal } from 'react-dom'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { useModalEscape } from '@/shared/hooks/useModalEscape'
import { unsavedDialogStyles as styles } from '@/styles/ui'

type UnsavedChangesDialogProps = {
  /** "Volver a la edición": cierra el aviso y deja todo como estaba. */
  onStay: () => void
  /** "Salir sin guardar": descarta los cambios y cierra. */
  onLeave: () => void
}

/**
 * Aviso al cerrar una edición con cambios sin guardar. Va por encima de cualquier modal; Escape
 * equivale a "Volver a la edición".
 */
export function UnsavedChangesDialog({ onStay, onLeave }: UnsavedChangesDialogProps) {
  useModalEscape(onStay)

  return createPortal(
    <div
      className={styles.overlay}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
      aria-describedby="unsaved-changes-description"
    >
      <div className={styles.panel}>
        <span aria-hidden="true" className={styles.icon}>
          <Icon d={ICONS.warning} className="size-6" />
        </span>
        <h3 id="unsaved-changes-title" className={styles.title}>
          Tenés cambios sin guardar
        </h3>
        <p id="unsaved-changes-description" className={styles.description}>
          Si salís ahora, se pierden. Para conservarlos, volvé y tocá el botón de guardar.
        </p>
        <div className={styles.actions}>
          <Button type="button" autoFocus onClick={onStay}>
            Volver a la edición
          </Button>
          <Button type="button" variant="ghost" onClick={onLeave}>
            Salir sin guardar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
