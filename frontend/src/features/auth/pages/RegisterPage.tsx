// Pestaña "Registrarme" (US-59 · RF-064): el formulario con el que una persona crea su propia cuenta de Cliente.
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES } from '@/domain/documents'
import type { ApiError } from '@/shared/api/ApiError'
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
import { useRegisterCustomer } from '../api/auth.queries'
import { AuthTabs } from '../components/AuthTabs'
import {
  registerSchema,
  type RegisterFormInput,
  type RegisterFormOutput,
} from '../schemas/register.schema'

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

// El 409 no trae un código: el dato repetido se deduce del mensaje del backend
// ('Customer with email "…" already exists' / 'Customer with DNI "…" already exists').
function conflictField(error: ApiError) {
  if (error.status !== 409) return undefined
  if (/\bemail\b/i.test(error.message)) return 'email'
  if (/\b(DNI|PASSPORT)\b/i.test(error.message)) return 'documentNumber'
  return undefined
}

const CONFLICT_MESSAGES = {
  email: 'Ya existe una cuenta con este mail',
  documentNumber: 'Ya existe una cuenta con este documento',
}

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
  const registerCustomer = useRegisterCustomer()

  const onSubmit = (data: RegisterFormOutput) => {
    registerCustomer.mutate(data, {
      onSuccess: () => reset(INITIAL_VALUES),
      onError: (error) => {
        const field = conflictField(error)
        if (field) {
          setError(
            field,
            { message: CONFLICT_MESSAGES[field] },
            { shouldFocus: true },
          )
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
  const generalError =
    registerCustomer.isError && !conflictField(registerCustomer.error)
      ? registerCustomer.error
      : undefined
  const isDni = useWatch({ control, name: 'documentType' }) === 'DNI'

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
            </Alert>
          )}

          {generalError && (
            <Alert variant="error" className="mb-6">
              {generalError.status === undefined
                ? generalError.message
                : generalError.status === 409
                  ? 'El documento o el mail ya pertenecen a una cuenta.'
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
              disabled={registerCustomer.isPending}
              className="w-full sm:w-auto"
            >
              {registerCustomer.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>
          </FormActions>
        </form>
      </PageCard>
    </Page>
  )
}
