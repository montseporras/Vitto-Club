import { useEffect } from 'react'
import { CustomerRegistrationForm } from '@/features/cashier'
import { Modal } from '@/shared/components/ui/Modal'
import { useRefreshCustomers } from '../api/customers.queries'

type RegisterCustomerModalProps = {
  onClose: () => void
  onCreated: () => void
}

/** "+ Registrar cliente": el mismo formulario que "Nuevo cliente" de Caja (CA-CLI.11). */
export function RegisterCustomerModal({ onClose, onCreated }: RegisterCustomerModalProps) {
  const refreshCustomers = useRefreshCustomers()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <Modal title="Registrar cliente" onClose={onClose} className="max-w-3xl">
      <CustomerRegistrationForm
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
