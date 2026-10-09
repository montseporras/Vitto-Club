// Pestaña "Registrarme" (US-59 · RF-064): el formulario con el que una persona crea su propia cuenta de Cliente.
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Navigate } from 'react-router'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES } from '@/domain/documents'
import {
  customerConflict,
  rejectedFields,
  REJECTED_FIELD_MESSAGE,
} from '@/features/cashier'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { FormActions } from '@/shared/components/forms/FormActions'
import { FormField } from '@/shared/components/forms/FormField'
import { FormSection } from '@/shared/components/forms/FormSection'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
import { Alert } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { DateInput } from '@/shared/components/ui/DateInput'
import { Input } from '@/shared/components/ui/Input'
import { Page, PageCard } from '@/shared/components/ui/Page'
import { PasswordInput } from '@/shared/components/ui/PasswordInput'
import { useLogin, useRegisterCustomer } from '../api/auth.queries'
import { AuthTabs } from '../components/AuthTabs'
import {
  registerSchema,
  type RegisterFormInput,
  type RegisterFormOutput,
} from '../schemas/register.schema'
import { useSession } from '../session'

const INITIAL_VALUES: RegisterFormInput = {
  firstName: '',
  lastName: '',
  documentType: 'DNI',
  documentNumber: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  password: '',
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
  'password',
] as const

export function RegisterPage() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    trigger,
    getValues,
    control,
    formState: { errors },
  } = useForm<RegisterFormInput, unknown, RegisterFormOutput>({
    resolver: zodResolver(registerSchema),
    defaultValues: INITIAL_VALUES,
    mode: 'onTouched',
  })
  const session = useSession()
  const registerCustomer = useRegisterCustomer()
  const login = useLogin()

  const onSubmit = (data: RegisterFormOutput) => {
    registerCustomer.mutate(data, {
      // El registro no inicia sesión: se entra con los datos recién cargados (docs/registro-api.md)
      onSuccess: () => {
        login.mutate({ email: data.email, password: data.password })
        reset(INITIAL_VALUES)
      },
      onError: (error) => {
        // El 409 del registro trae el campo y el mensaje a mostrar (docs/registro-api.md)
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
  const a11y = (field: Exclude<keyof RegisterFormInput, 'documentType'>) => ({
    id: field,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  })

  // El documento o mail repetido se marca en su campo; el resto de los errores, arriba.
  const conflict = registerCustomer.isError
    ? customerConflict(registerCustomer.error)
    : undefined
  const generalError =
    registerCustomer.isError && !conflict?.field
      ? registerCustomer.error
      : undefined
  const isDni = useWatch({ control, name: 'documentType' }) === 'DNI'
  const submitting = registerCustomer.isPending || login.isPending

  // Con sesión (recién creada o ya abierta) va a la pantalla de su rol ("/")
  if (session.status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  return (
    <Page className="max-w-5xl">
      <PageCard
        eyebrow="Vitto Club"
        title="Registrarme"
        description="Creá tu cuenta para sumarte al programa y canjear puntos por recompensas"
      >
        <AuthTabs />

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          {registerCustomer.isSuccess && (
            <Alert variant="success" className="mb-6">
              ¡Listo! Tu cuenta quedó creada con el mail{' '}
              <strong>{registerCustomer.variables.email}</strong>.
              {login.isError &&
                ' No pudimos iniciar tu sesión: entrá desde "Ingresar" con tu mail y contraseña.'}
            </Alert>
          )}

          {generalError && (
            <Alert variant="error" className="mb-6">
              {generalError.status === undefined
                ? generalError.message
                : conflict
                  ? generalError.message
                  : generalError.status === 400
                    ? 'Revisá los datos: no pudimos crear la cuenta.'
                    : 'No pudimos crear la cuenta. Intentá de nuevo.'}
            </Alert>
          )}

          <FormSection step={1} title="Datos personales">
            <FormField
              id="firstName"
              label="Nombre"
              error={errors.firstName?.message}
            >
              <Input
                autoFocus
                autoComplete="given-name"
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
                autoComplete="family-name"
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
              <DateInput {...a11y('dateOfBirth')} {...register('dateOfBirth')} />
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
            <FormField id="email" label="Mail" error={errors.email?.message}>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
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
                autoComplete="tel"
                {...a11y('phone')}
                {...register('phone')}
              />
            </FormField>
          </FormSection>

          <FormSection step={4} title="Acceso">
            <div className="sm:col-span-2">
              <FormField
                id="password"
                label="Contraseña"
                hint="Entre 8 y 64 caracteres."
                error={errors.password?.message}
              >
                <PasswordInput
                  autoComplete="new-password"
                  {...a11y('password')}
                  aria-describedby={
                    errors.password ? 'password-error' : 'password-hint'
                  }
                  {...register('password')}
                />
              </FormField>
            </div>
          </FormSection>

          <StatusText className="mt-6 text-sm">
            Ante cualquier duda o inconveniente, comunicate con el restaurante
          </StatusText>

          <FormActions>
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {registerCustomer.isPending
                ? 'Creando cuenta…'
                : login.isPending
                  ? 'Ingresando…'
                  : 'Crear cuenta'}
            </Button>
          </FormActions>
        </form>
      </PageCard>
    </Page>
  )
}
