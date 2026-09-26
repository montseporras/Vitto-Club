import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES } from '@/domain/documents'
import { FormField } from '@/shared/components/forms/FormField'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
import { Alert } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { DateInput } from '@/shared/components/ui/DateInput'
import { Input } from '@/shared/components/ui/Input'
import { isoToDisplayDate } from '@/shared/lib/dates'
import { useUpdateClient } from '../api/caja.queries'
import {
  altaClienteSchema,
  type AltaClienteFormInput,
  type AltaClienteFormOutput,
} from '../schemas/alta-cliente.schema'
import type { Client, UpdateClientBody } from '../types/cliente'
import { FormSection } from './FormSection'

const DOCUMENT_OPTIONS = DOCUMENT_TYPE_VALUES.map((type) => ({
  value: type,
  label: DOCUMENT_TYPES[type].label,
}))

const REQUIRED_FIELDS = [
  'firstName',
  'lastName',
  'documentType',
  'documentNumber',
  'email',
] as const

const toFormValues = (client: Client): AltaClienteFormInput => ({
  firstName: client.firstName,
  lastName: client.lastName,
  documentType: client.documentType,
  documentNumber: client.documentNumber,
  email: client.email,
  phone: client.phone ?? '',
  dateOfBirth: isoToDisplayDate(client.dateOfBirth),
})

/** Arma el body del PATCH solo con lo que cambió. Vaciar un opcional lo borra (null). */
function buildChanges(client: Client, data: AltaClienteFormOutput) {
  const changes: UpdateClientBody = {}
  for (const field of REQUIRED_FIELDS) {
    if (data[field] !== client[field]) {
      Object.assign(changes, { [field]: data[field] })
    }
  }
  const phone = data.phone ?? null
  if (phone !== client.phone) changes.phone = phone
  const dateOfBirth = data.dateOfBirth ?? null
  if (dateOfBirth !== client.dateOfBirth) changes.dateOfBirth = dateOfBirth
  return changes
}

type EditClientFormProps = {
  client: Client
  onSaved: (client: Client) => void
  onCancel: () => void
}

/** RF-016: modificar los datos de un cliente que ya existe. */
export function EditClientForm({ client, onSaved, onCancel }: EditClientFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    trigger,
    getValues,
    control,
    formState: { errors },
  } = useForm<AltaClienteFormInput, unknown, AltaClienteFormOutput>({
    resolver: zodResolver(altaClienteSchema),
    defaultValues: toFormValues(client),
    mode: 'onTouched',
  })
  const updateClient = useUpdateClient()
  const [noChanges, setNoChanges] = useState(false)

  const onSubmit = (data: AltaClienteFormOutput) => {
    const changes = buildChanges(client, data)
    if (Object.keys(changes).length === 0) {
      setNoChanges(true)
      return
    }
    setNoChanges(false)
    updateClient.mutate(
      { id: client.id, body: changes },
      {
        onSuccess: onSaved,
        onError: (error) => {
          // 409 por documento repetido (el otro 409 es por cliente dado de baja)
          if (error.status === 409 && error.message.includes('already exists')) {
            setError(
              'documentNumber',
              { message: 'Ya existe otro cliente registrado con este documento' },
              { shouldFocus: true },
            )
          }
        },
      },
    )
  }

  const a11y = (
    field: Exclude<keyof AltaClienteFormInput, 'documentType'>,
  ) => ({
    id: `edit-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `edit-${field}-error` : undefined,
  })

  const generalError =
    updateClient.isError && !errors.documentNumber ? updateClient.error : undefined
  const isDni = useWatch({ control, name: 'documentType' }) === 'DNI'

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      {generalError && (
        <Alert variant="error" className="mb-6">
          {generalError.status === 409
            ? 'No se pudo guardar: el cliente está dado de baja.'
            : generalError.status === 400
              ? 'Revisá los datos: el servidor rechazó los cambios.'
              : 'No se pudieron guardar los cambios.'}
          {generalError.messages.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {generalError.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
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
          field={register('documentType', {
            onChange: () => {
              if (getValues('documentNumber')) trigger('documentNumber')
            },
          })}
        />

        <FormField
          id="edit-documentNumber"
          label="Número de documento"
          error={errors.documentNumber?.message}
        >
          <Input
            inputMode={isDni ? 'numeric' : 'text'}
            autoComplete="off"
            {...a11y('documentNumber')}
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

      <div className="mt-8 flex flex-col-reverse items-stretch gap-3 border-t border-accent-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
        {noChanges && (
          <p role="status" className="text-sm text-neutral-700 sm:mr-auto">
            No modificaste ningún dato.
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onCancel}
          disabled={updateClient.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={updateClient.isPending}>
          {updateClient.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
