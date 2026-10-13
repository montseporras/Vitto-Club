import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES } from '@/domain/documents'
import { FormActions } from '@/shared/components/forms/FormActions'
import { FormField } from '@/shared/components/forms/FormField'
import { FormSection } from '@/shared/components/forms/FormSection'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { DateInput } from '@/shared/components/ui/DateInput'
import { Input } from '@/shared/components/ui/Input'
import { isoToDisplayDate } from '@/shared/lib/dates'
import { useUpdateCustomer } from '../api/cashier.queries'
import {
  customerConflict,
  rejectedFields,
  REJECTED_FIELD_MESSAGE,
} from '../api/customer-errors'
import {
  createCustomerSchema,
  type CreateCustomerFormInput,
  type CreateCustomerFormOutput,
} from '../schemas/create-customer.schema'
import type { Customer, UpdateCustomerBody } from '../types/customer'

const DOCUMENT_OPTIONS = DOCUMENT_TYPE_VALUES.map((type) => ({
  value: type,
  label: DOCUMENT_TYPES[type].label,
}))

// El documento (tipo y número) se muestra bloqueado: no se edita ni viaja en el PATCH.
const REQUIRED_FIELDS = ['firstName', 'lastName', 'email'] as const
const EDITABLE_FIELDS = [...REQUIRED_FIELDS, 'phone', 'dateOfBirth'] as const

const toFormValues = (customer: Customer): CreateCustomerFormInput => ({
  firstName: customer.firstName,
  lastName: customer.lastName,
  documentType: customer.documentType,
  documentNumber: customer.documentNumber,
  email: customer.email,
  phone: customer.phone ?? '',
  dateOfBirth: isoToDisplayDate(customer.dateOfBirth),
})

/** Arma el body del PATCH solo con lo que cambió. Vaciar un opcional lo borra (null). */
function buildChanges(customer: Customer, data: CreateCustomerFormOutput) {
  const changes: UpdateCustomerBody = {}
  for (const field of REQUIRED_FIELDS) {
    if (data[field] !== customer[field]) {
      Object.assign(changes, { [field]: data[field] })
    }
  }
  const phone = data.phone ?? null
  if (phone !== customer.phone) changes.phone = phone
  const dateOfBirth = data.dateOfBirth ?? null
  if (dateOfBirth !== customer.dateOfBirth) changes.dateOfBirth = dateOfBirth
  return changes
}

type EditCustomerFormProps = {
  customer: Customer
  onSaved: (customer: Customer) => void
  onCancel: () => void
}

/** RF-016: modificar los datos de un cliente que ya existe. */
export function EditCustomerForm({ customer, onSaved, onCancel }: EditCustomerFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateCustomerFormInput, unknown, CreateCustomerFormOutput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: toFormValues(customer),
    mode: 'onTouched',
  })
  const updateCustomer = useUpdateCustomer()
  const [noChanges, setNoChanges] = useState(false)

  const onSubmit = (data: CreateCustomerFormOutput) => {
    const changes = buildChanges(customer, data)
    if (Object.keys(changes).length === 0) {
      setNoChanges(true)
      return
    }
    setNoChanges(false)
    updateCustomer.mutate(
      { id: customer.id, body: changes },
      {
        onSuccess: onSaved,
        onError: (error) => {
          // El mail repetido se marca en su campo (el documento no se edita)
          const conflict = customerConflict(error)
          if (conflict?.field === 'email') {
            setError(
              'email',
              { message: conflict.message },
              { shouldFocus: true },
            )
          }
          for (const field of rejectedFields(error, EDITABLE_FIELDS)) {
            setError(field, { message: REJECTED_FIELD_MESSAGE })
          }
        },
      },
    )
  }

  const a11y = (
    field: Exclude<keyof CreateCustomerFormInput, 'documentType'>,
  ) => ({
    id: `edit-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `edit-${field}-error` : undefined,
  })

  const conflict = updateCustomer.isError
    ? customerConflict(updateCustomer.error)
    : undefined
  const generalError =
    updateCustomer.isError && conflict?.field !== 'email'
      ? updateCustomer.error
      : undefined

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      {generalError && (
        <Alert variant="error" className="mb-6">
          {conflict ? (
            `No se pudo guardar. ${conflict.message}`
          ) : (
            <>
              {generalError.status === 400
                ? 'Revisá los datos: el servidor rechazó los cambios.'
                : 'No se pudieron guardar los cambios.'}
              <AlertMessages messages={generalError.messages} />
            </>
          )}
        </Alert>
      )}

      <FormSection step={1} title="Datos personales">
        <FormField
          id="edit-firstName"
          label="Nombre"
          error={errors.firstName?.message}
        >
          <Input
            autoFocus
            autoComplete="off"
            {...a11y('firstName')}
            {...register('firstName')}
          />
        </FormField>

        <FormField
          id="edit-lastName"
          label="Apellido"
          error={errors.lastName?.message}
        >
          <Input
            autoComplete="off"
            {...a11y('lastName')}
            {...register('lastName')}
          />
        </FormField>

        <FormField
          id="edit-dateOfBirth"
          label="Fecha de nacimiento"
          optional
          error={errors.dateOfBirth?.message}
        >
          <DateInput
            {...a11y('dateOfBirth')}
            {...register('dateOfBirth')}
          />
        </FormField>
      </FormSection>

      <FormSection step={2} title="Documento">
        <SegmentedRadio
          legend="Tipo de documento"
          options={DOCUMENT_OPTIONS}
          field={register('documentType')}
          disabled
        />

        <FormField
          id="edit-documentNumber"
          label="Número de documento"
          hint="El documento no se puede modificar."
        >
          <Input
            readOnly
            aria-describedby="edit-documentNumber-hint"
            {...register('documentNumber')}
          />
        </FormField>
      </FormSection>

      <FormSection step={3} title="Contacto">
        <FormField
          id="edit-email"
          label="Correo electrónico"
          error={errors.email?.message}
        >
          <Input
            type="email"
            inputMode="email"
            autoComplete="off"
            {...a11y('email')}
            {...register('email')}
          />
        </FormField>

        <FormField
          id="edit-phone"
          label="Teléfono"
          optional
          error={errors.phone?.message}
        >
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="off"
            {...a11y('phone')}
            {...register('phone')}
          />
        </FormField>
      </FormSection>

      <FormActions message={noChanges && 'No modificaste ningún dato.'}>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onCancel}
          disabled={updateCustomer.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={updateCustomer.isPending}>
          {updateCustomer.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </FormActions>
    </form>
  )
}
