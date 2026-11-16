import { useEffect, useState } from 'react'
import { CustomerRegistrationForm } from '@/features/cashier'
import { Modal } from '@/shared/components/ui/Modal'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { useRefreshCustomers } from '../api/customers.queries'

type RegisterCustomerModalProps = {
  onClose: () => void
  onCreated: () => void
}

/** "+ Registrar cliente": el mismo formulario que "Nuevo cliente" de Caja (CA-CLI.11). */
export function RegisterCustomerModal({ onClose, onCreated }: RegisterCustomerModalProps) {
  const refreshCustomers = useRefreshCustomers()
  // Cerrar con datos cargados (cruz o Escape) pregunta antes de descartarlos
  const [dirty, setDirty] = useState(false)
  const { guard, dialog: unsavedDialog } = useUnsavedChangesGuard(dirty)
  const requestClose = guard(onClose)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose])

  return (
    <Modal title="Registrar cliente" onClose={requestClose} className="max-w-3xl">
      {unsavedDialog}
      <CustomerRegistrationForm
        onDirtyChange={setDirty}
        // El aviso de éxito se muestra en el listado, al cerrarse el modal
        showSuccess={false}
        onCreated={() => {
          void refreshCustomers()
          onCreated()
        }}
      />
    </Modal>
  )
}
