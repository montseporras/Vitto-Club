import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { DOCUMENT_TYPES } from '@/domain/documents'
import { LEVELS } from '@/domain/levels'
import {
  customerConflict,
  rejectedFields,
  REJECTED_FIELD_MESSAGE,
} from '@/features/cashier'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Input } from '@/shared/components/ui/Input'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { modalStyles, pointsToneStyles } from '@/styles/ui'
import { useUpdateCustomerAdmin } from '../api/customers.queries'
import {
  updateCustomerSchema,
  type UpdateCustomerFormInput,
  type UpdateCustomerFormOutput,
} from '../schemas/update-customer.schema'
import type { CustomerListItem, UpdateCustomerAdminBody } from '../types/customers'

const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone'] as const

/** Arma el body del PATCH solo con lo que cambió, más el motivo. Vaciar el teléfono lo borra. */
function buildChanges(
  customer: CustomerListItem,
  data: UpdateCustomerFormOutput,
): UpdateCustomerAdminBody | null {
  const changes: UpdateCustomerAdminBody = { reason: data.reason }
  if (data.firstName !== customer.firstName) changes.firstName = data.firstName
  if (data.lastName !== customer.lastName) changes.lastName = data.lastName
  if (data.email !== customer.email) changes.email = data.email
  const phone = data.phone ?? null
  if (phone !== customer.phone) changes.phone = phone
  // Solo el motivo no cuenta como cambio: el backend responde 400 (§3.8.2)
  return Object.keys(changes).length > 1 ? changes : null
}

type CustomerDetailsModalProps = {
  customer: CustomerListItem
  onClose: () => void
  onDelete: () => void
  onSaved: () => void
}

/** "Ver más" de Clientes: datos del cliente y, con Editar, el formulario (CA-CLI.3 y CA-CLI.4). */
export function CustomerDetailsModal({
  customer,
  onClose,
  onDelete,
  onSaved,
}: CustomerDetailsModalProps) {
  const [editing, setEditing] = useState(false)
  const [noChanges, setNoChanges] = useState(false)
  const updateCustomer = useUpdateCustomerAdmin()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateCustomerFormInput, unknown, UpdateCustomerFormOutput>({
    resolver: zodResolver(updateCustomerSchema),
    defaultValues: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone ?? '',
      reason: '',
    },
    mode: 'onTouched',
  })

  // Escape cierra el modal
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onSubmit = (data: UpdateCustomerFormOutput) => {
    const changes = buildChanges(customer, data)
    setNoChanges(changes === null)
    if (!changes) return

    updateCustomer.mutate(
      { id: customer.id, body: changes },
      {
        onSuccess: onSaved,
        onError: (error) => {
          // El mail repetido se marca en su campo (el documento no se edita)
          const conflict = customerConflict(error)
          if (conflict?.field === 'email') {
            setError('email', { message: conflict.message }, { shouldFocus: true })
          }
          for (const field of rejectedFields(error, EDITABLE_FIELDS)) {
            setError(field, { message: REJECTED_FIELD_MESSAGE })
          }
        },
      },
    )
  }

  const a11y = (field: keyof UpdateCustomerFormInput) => ({
    id: `customer-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `customer-${field}-error` : undefined,
  })

  const conflict = updateCustomer.isError
    ? customerConflict(updateCustomer.error)
    : undefined
  const generalError =
    updateCustomer.isError && conflict?.field !== 'email'
      ? updateCustomer.error
      : undefined
  const documentLabel = DOCUMENT_TYPES[customer.documentType].label

  // Diálogo blanco, sin franjas de color, con la cruz en la esquina (prototipo: .dialog)
  return createPortal(
    <div
      className={modalStyles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-details-title"
    >
      <div className={cn(modalStyles.panel, 'relative max-w-xl overflow-y-auto p-6 sm:p-8')}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          title="Cerrar"
          className={modalStyles.closeIcon}
        >
          <Icon d={ICONS.close} className="size-5" />
        </button>
        <h3 id="customer-details-title" className="pr-10 text-2xl leading-tight text-accent-800">
          {customer.firstName} {customer.lastName}
        </h3>

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-5">
          {editing ? (
            <div className="flex flex-col gap-4">
              {generalError && (
                <Alert variant="error">
                  {conflict ? (
                    conflict.message
                  ) : (
                    <>
                      No se pudo guardar el cliente.
                      <AlertMessages messages={generalError.messages} />
                    </>
                  )}
                </Alert>
              )}

              <FormField id="customer-firstName" label="Nombre" error={errors.firstName?.message}>
                <Input autoFocus autoComplete="off" {...a11y('firstName')} {...register('firstName')} />
              </FormField>

              <FormField id="customer-lastName" label="Apellido" error={errors.lastName?.message}>
                <Input autoComplete="off" {...a11y('lastName')} {...register('lastName')} />
              </FormField>

              {/* El documento no se edita (decisión de Melisa): se muestra bloqueado */}
              <FormField
                id="customer-documentNumber"
                label={documentLabel}
                hint="El documento no se puede modificar."
                hideRequiredMark
              >
                <Input
                  id="customer-documentNumber"
                  value={customer.documentNumber}
                  disabled
                  readOnly
                  aria-describedby="customer-documentNumber-hint"
                />
              </FormField>

              <FormField id="customer-phone" label="Teléfono" optional error={errors.phone?.message}>
                <Input type="tel" inputMode="tel" autoComplete="off" {...a11y('phone')} {...register('phone')} />
              </FormField>

              <FormField id="customer-email" label="Mail" error={errors.email?.message}>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  {...a11y('email')}
                  {...register('email')}
                />
              </FormField>

              <FormField
                id="customer-reason"
                label="Motivo del cambio (obligatorio)"
                hideRequiredMark
                error={errors.reason?.message}
              >
                <Input
                  placeholder="Ej: corrección de datos a pedido del cliente"
                  autoComplete="off"
                  {...a11y('reason')}
                  {...register('reason')}
                />
              </FormField>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <p>
                <strong>{documentLabel}:</strong> {customer.documentNumber}
              </p>
              <p>
                <strong>Nivel:</strong> {LEVELS[customer.level]} · <strong>Saldo:</strong>{' '}
                <span className={cn(customer.balance < 0 && pointsToneStyles.negative)}>
                  {formatInteger(customer.balance)} pts
                </span>{' '}
                · <strong>Acumulados:</strong> {formatInteger(customer.lifetimePoints)} pts
              </p>
              <p>
                <strong>Teléfono:</strong> {customer.phone ?? '—'}
              </p>
              <p>
                <strong>Mail:</strong> {customer.email}
              </p>
              <p>
                <strong>Estado:</strong> {customer.active ? 'Activo' : 'Inactivo'}
              </p>
            </div>
          )}

          {editing && noChanges && (
            <p role="status" className="mt-4 text-sm text-neutral-600">
              No modificaste ningún dato.
            </p>
          )}

          {/* Eliminar a la izquierda; Cerrar y Editar (o Guardar cambios) a la derecha */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Button type="button" variant="ghost" onClick={onDelete} className="mr-auto">
              Eliminar
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            {editing ? (
              <Button type="submit" disabled={updateCustomer.isPending}>
                {updateCustomer.isPending ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            ) : (
              <Button type="button" onClick={() => setEditing(true)}>
                Editar
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
