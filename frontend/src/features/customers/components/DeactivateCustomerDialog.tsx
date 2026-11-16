import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/shared/components/ui/Button'
import { DeleteButton } from '@/shared/components/ui/DeleteButton'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { modalStyles } from '@/styles/ui'
import type { CustomerListItem } from '../types/customers'

type DeactivateCustomerDialogProps = {
  customer: CustomerListItem
  onCancel: () => void
  /** Confirmó: la pantalla oculta al cliente y ofrece "Deshacer" antes de mandar la baja. */
  onConfirm: () => void
}

/** Confirmación de la baja lógica (CA-CLI.9, contrato §3.8.3). Texto del contrato. */
export function DeactivateCustomerDialog({
  customer,
  onCancel,
  onConfirm,
}: DeactivateCustomerDialogProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return createPortal(
    <div
      className={modalStyles.overlay}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="deactivate-customer-title"
      aria-describedby="deactivate-customer-description"
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
        <h3 id="deactivate-customer-title" className="text-2xl leading-tight text-accent-800">
          Eliminar cliente
        </h3>
        <p id="deactivate-customer-description" className="mt-3">
          ¿Seguro que querés eliminar a{' '}
          <strong>
            {customer.firstName} {customer.lastName}
          </strong>
          ? Va a dejar de aparecer en el listado. Si te equivocás, tenés unos segundos para
          deshacerlo.
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-2.5">
          <Button type="button" variant="secondary" autoFocus onClick={onCancel}>
            Cancelar
          </Button>
          <DeleteButton type="button" variant="danger" onClick={onConfirm} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
