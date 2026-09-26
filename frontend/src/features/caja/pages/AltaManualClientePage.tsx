import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES } from '@/domain/documents'
import { FormField } from '@/shared/components/forms/FormField'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
import { Alert } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useCreateClient } from '../api/caja.queries'
import {
  altaClienteSchema,
  type AltaClienteFormInput,
  type AltaClienteFormOutput,
} from '../schemas/alta-cliente.schema'

const INITIAL_VALUES: AltaClienteFormInput = {
  firstName: '',
  lastName: '',
  documentType: 'DNI',
  documentNumber: '',
  email: '',
  phone: '',
  dateOfBirth: '',
}

const TODAY = new Date().toISOString().slice(0, 10)

const DOCUMENT_OPTIONS = DOCUMENT_TYPE_VALUES.map((type) => ({
  value: type,
  label: DOCUMENT_TYPES[type].label,
}))

/** US-17 · RF-015: el Cajero da de alta a un cliente que no encontró por documento. */
export function AltaManualClientePage() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    trigger,
    getValues,
    control,
    formState: { errors },
  } = useForm<AltaClienteFormInput, unknown, AltaClienteFormOutput>({
    resolver: zodResolver(altaClienteSchema),
    defaultValues: INITIAL_VALUES,
    mode: 'onTouched',
  })
  const createClient = useCreateClient()

  const onSubmit = (data: AltaClienteFormOutput) => {
    createClient.mutate(data, {
        onSuccess: () => {
          reset(INITIAL_VALUES)
          setFocus('firstName')
        },
        onError: (error) => {
          if (error.status === 409) {
            setError(
              'documentNumber',
              { message: 'Ya existe un cliente registrado con este documento' },
              { shouldFocus: true },
            )
          }
        },
    })
  }

  // Props comunes de accesibilidad para cada input con su mensaje de error
  const a11y = (
    field: Exclude<keyof AltaClienteFormInput, 'documentType'>,
  ) => ({
    id: field,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  })

  const created = createClient.isSuccess ? createClient.data : undefined
  const generalError =
    createClient.isError && createClient.error.status !== 409
      ? createClient.error
      : undefined
  const isDni = useWatch({ control, name: 'documentType' }) === 'DNI'

  return (
    <section className="mx-auto w-full max-w-3xl">
      <p className="font-heading text-xs font-extrabold uppercase tracking-[0.12em] text-accent-700">
        Clientes
      </p>
      <h2 className="mt-1 text-2xl sm:text-3xl">Alta manual de cliente</h2>
      <p className="mt-2 text-sm text-neutral-700">
        Registrá al cliente cuando no lo encontrás por documento.
      </p>

      {created && (
        <Alert variant="success" className="mt-5">
          <p>
            Cliente registrado correctamente:{' '}
            <strong>
              {created.firstName} {created.lastName}
            </strong>{' '}
            ({DOCUMENT_TYPES[created.documentType].label}{' '}
            {created.documentNumber}).
          </p>
        </Alert>
      )}

      {generalError && (
        <Alert variant="error" className="mt-5">
          {generalError.status === 400
            ? 'Revisá los datos: el servidor rechazó el alta.'
            : 'No se pudo registrar el cliente.'}
          {generalError.messages.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {generalError.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 rounded-2xl border border-divider/50 bg-bg/80 p-5 shadow-lg backdrop-blur-sm sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="firstName" label="Nombre" error={errors.firstName?.message}>
            <Input
              autoFocus
              autoComplete="off"
              {...a11y('firstName')}
              {...register('firstName')}
            />
          </FormField>

          <FormField
            id="lastName"
            label="Apellido"
            error={errors.lastName?.message}
          >
            <Input
              autoComplete="off"
              {...a11y('lastName')}
              {...register('lastName')}
            />
          </FormField>

          <SegmentedRadio
            legend="Tipo de documento"
            options={DOCUMENT_OPTIONS}
            field={register('documentType', {
              // El formato válido depende del tipo: revalida el número ya escrito
              onChange: () => {
                if (getValues('documentNumber')) trigger('documentNumber')
              },
            })}
          />

          <FormField
            id="documentNumber"
            label="Número de documento"
            error={errors.documentNumber?.message}
          >
            <Input
              inputMode={isDni ? 'numeric' : 'text'}
              placeholder="30111222"
              autoComplete="off"
              {...a11y('documentNumber')}
              {...register('documentNumber')}
            />
          </FormField>

          <FormField
            id="email"
            label="Correo electrónico"
            error={errors.email?.message}
          >
            <Input
              type="email"
              inputMode="email"
              placeholder="cliente@mail.com"
              autoComplete="off"
              {...a11y('email')}
              {...register('email')}
            />
          </FormField>

          <FormField
            id="phone"
            label="Teléfono"
            error={errors.phone?.message}
          >
            <Input
              type="tel"
              inputMode="tel"
              placeholder="351 1234567"
              autoComplete="off"
              {...a11y('phone')}
              {...register('phone')}
            />
          </FormField>

          <FormField
            id="dateOfBirth"
            label="Fecha de nacimiento"
            error={errors.dateOfBirth?.message}
          >
            <Input
              type="date"
              max={TODAY}
              {...a11y('dateOfBirth')}
              {...register('dateOfBirth')}
            />
          </FormField>
        </div>

        <div className="mt-7 flex justify-end border-t border-divider/40 pt-5">
          <Button
            type="submit"
            size="lg"
            disabled={createClient.isPending}
            className="w-full sm:w-auto"
          >
            {createClient.isPending ? 'Registrando…' : 'Registrar cliente'}
          </Button>
        </div>
      </form>
    </section>
  )
}
