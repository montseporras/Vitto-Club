import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
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
import { useCreateCustomer, type DocumentSearch } from '../api/cashier.queries'
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
import type { Customer } from '../types/customer'

const INITIAL_VALUES: CreateCustomerFormInput = {
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

const FIELDS = [
  'firstName',
  'lastName',
  'documentNumber',
  'email',
  'phone',
  'dateOfBirth',
] as const

type CustomerRegistrationFormProps = {
  /** Documento ya cargado (ej. el que se buscó sin resultados). */
  initialDocument?: DocumentSearch | null
  /** Se llama después del alta, con el cliente creado. */
  onCreated?: (customer: Customer) => void
  /** Muestra el aviso de éxito arriba del formulario (Caja). Sin él, lo muestra quien lo usa. */
  showSuccess?: boolean
  /** Con él, la botonera suma "Cancelar" (Nuevo cliente de Caja, prototipo v2). */
  onCancel?: () => void
  /**
   * Cómo se ubican los avisos (éxito y error) respecto del formulario. Por defecto, uno abajo
   * del otro; "Nuevo cliente" de Caja pone los avisos arriba de la tarjeta.
   */
  layout?: (feedback: ReactNode, form: ReactNode) => ReactNode
}

/** Mensaje de éxito del alta (CA-17AJ.9, contrato §3.8.4). */
export const CUSTOMER_REGISTERED_MESSAGE =
  'Cliente registrado. Ingresa con su mail y su número de documento como contraseña; al entrar se le va a pedir que la cambie.'

const defaultLayout = (feedback: ReactNode, form: ReactNode) => (
  <>
    {feedback}
    {form}
  </>
)

/**
 * Formulario de alta de cliente (US-17 · RF-015, US-17-AJ). Lo usan "Nuevo cliente" de Caja
 * y "+ Registrar cliente" de Clientes del Administrador (CA-CLI.11): es el mismo formulario.
 */
export function CustomerRegistrationForm({
  initialDocument,
  onCreated,
  showSuccess = true,
  onCancel,
  layout = defaultLayout,
}: CustomerRegistrationFormProps) {
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
  } = useForm<CreateCustomerFormInput, unknown, CreateCustomerFormOutput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: { ...INITIAL_VALUES, ...initialDocument },
    mode: 'onTouched',
  })
  const createCustomer = useCreateCustomer()

  const onSubmit = (data: CreateCustomerFormOutput) => {
    createCustomer.mutate(data, {
        onSuccess: (customer) => {
          reset(INITIAL_VALUES)
          setFocus('firstName')
          onCreated?.(customer)
        },
        onError: (error) => {
          // El dato repetido (documento o mail) se marca en su campo
          const conflict = customerConflict(error)
          if (conflict?.field) {
            setError(
              conflict.field,
              { message: conflict.message },
              { shouldFocus: true },
            )
          }
          for (const field of rejectedFields(error, FIELDS)) {
            setError(field, { message: REJECTED_FIELD_MESSAGE })
          }
        },
    })
  }

  // Props comunes de accesibilidad para cada input con su mensaje de error
  const a11y = (
    field: Exclude<keyof CreateCustomerFormInput, 'documentType'>,
  ) => ({
    id: field,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  })

  const created = showSuccess && createCustomer.isSuccess
  // Un conflicto con campo se muestra en ese campo; el resto de los errores, arriba.
  const conflict = createCustomer.isError
    ? customerConflict(createCustomer.error)
    : undefined
  const generalError =
    createCustomer.isError && !conflict?.field
      ? createCustomer.error
      : undefined
  const isDni = useWatch({ control, name: 'documentType' }) === 'DNI'

  const feedback = (
    <>
      {created && (
        <Alert variant="success" className="mb-5">
          <p>{CUSTOMER_REGISTERED_MESSAGE}</p>
        </Alert>
      )}

      {generalError && (
        <Alert variant="error" className="mb-5">
          {conflict ? (
            conflict.message
          ) : (
            <>
              {generalError.status === 400
                ? 'Revisá los datos: el servidor rechazó el alta.'
                : 'No se pudo registrar el cliente.'}
              <AlertMessages messages={generalError.messages} />
            </>
          )}
        </Alert>
      )}
    </>
  )

  const form = (
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

      <FormActions message="Los campos marcados con * son obligatorios">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={createCustomer.isPending}
          className="w-full sm:w-auto"
        >
          {createCustomer.isPending ? 'Registrando…' : 'Registrar cliente'}
        </Button>
      </FormActions>
    </form>
  )

  return layout(feedback, form)
}
