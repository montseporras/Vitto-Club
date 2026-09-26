import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import logoIso from '@/assets/logo-vitto-iso-white.png'
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
    <section className="mx-auto w-full max-w-4xl">
      {created && (
        <Alert variant="success" className="mb-5">
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
        <Alert variant="error" className="mb-5">
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

      <div className="overflow-hidden rounded-3xl border border-accent-200 bg-surface shadow-xl shadow-accent-800/10 xl:grid xl:grid-cols-[17rem_1fr]">
        <header className="relative overflow-hidden bg-accent-700 px-6 py-7 text-white sm:px-8 xl:py-10">
          <img
            src={logoIso}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-6 bottom-8 hidden h-48 w-auto opacity-20 xl:block"
          />
          <p className="text-xs font-bold uppercase tracking-[0.18em]">
            Clientes
          </p>
          <h2 className="mt-2 text-3xl leading-tight sm:text-4xl">
            Alta manual de cliente
          </h2>
          <p className="mt-3 max-w-xs text-base">
            Registrá al cliente cuando no lo encontrás por documento.
          </p>
        </header>

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="px-5 py-6 sm:px-8 sm:py-8"
        >
          <FormSection step={1} title="Datos personales">
            <FormField
              id="firstName"
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

            <FormField
              id="dateOfBirth"
              label="Fecha de nacimiento"
              optional
              error={errors.dateOfBirth?.message}
            >
              <Input
                type="date"
                max={TODAY}
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
          </FormSection>

          <FormSection step={3} title="Contacto">
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
              optional
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
          </FormSection>

          <div className="mt-8 flex justify-end border-t border-accent-100 pt-6">
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
      </div>
    </section>
  )
}

type FormSectionProps = {
  step: number
  title: string
  children: ReactNode
}

/** Bloque del formulario con número y título, para ubicarse rápido en caja. */
function FormSection({ step, title, children }: FormSectionProps) {
  return (
    <fieldset className="mt-7 first:mt-0">
      <legend className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full bg-accent font-heading text-base font-bold text-ink"
        >
          {step}
        </span>
        <span className="font-heading text-xl font-bold text-accent-800">
          {title}
        </span>
      </legend>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
