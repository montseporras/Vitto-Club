import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES } from '@/domain/documents'
import { FormActions } from '@/shared/components/forms/FormActions'
import { FormField } from '@/shared/components/forms/FormField'
import { FormSection } from '@/shared/components/forms/FormSection'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { DateInput } from '@/shared/components/ui/DateInput'
import { Input } from '@/shared/components/ui/Input'
import { Page, PageCard } from '@/shared/components/ui/Page'
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
    <Page>
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
          <AlertMessages messages={generalError.messages} />
        </Alert>
      )}

      <PageCard eyebrow="Clientes" title="Registrar">
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
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

          <FormActions>
            <Button
              type="submit"
              size="lg"
              disabled={createClient.isPending}
              className="w-full sm:w-auto"
            >
              {createClient.isPending ? 'Registrando…' : 'Registrar cliente'}
            </Button>
          </FormActions>
        </form>
      </PageCard>
    </Page>
  )
}
