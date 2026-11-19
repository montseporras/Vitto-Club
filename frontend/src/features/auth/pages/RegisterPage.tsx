// Pestaña "Registrarme" (US-58 · RF-064): el formulario con el que una persona crea su propia cuenta de Cliente.
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Navigate } from 'react-router'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES } from '@/domain/documents'
import {
  customerConflict,
  rejectedFields,
  REJECTED_FIELD_MESSAGE,
} from '@/features/cashier'
import { FormField } from '@/shared/components/forms/FormField'
import { PasswordChecklist } from '@/shared/components/forms/PasswordChecklist'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
import { SubmitHint } from '@/shared/components/forms/SubmitHint'
import { Alert } from '@/shared/components/ui/Alert'
import { AuthShell } from '@/shared/components/ui/AuthShell'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { PasswordInput } from '@/shared/components/ui/PasswordInput'
import { SplitDateInput } from '@/shared/components/ui/SplitDateInput'
import { useMissingFields } from '@/shared/hooks/useMissingFields'
import { cn } from '@/shared/lib/utils'
import { authFormStyles } from '@/styles/ui'
import { useLogin, useRegisterCustomer } from '../api/auth.queries'
import { AuthFormSection } from '../components/AuthFormSection'
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
    mode: 'onChange',
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
  const [password, email, documentNumber] = useWatch({
    control,
    name: ['password', 'email', 'documentNumber'],
  })
  const submitting = registerCustomer.isPending || login.isPending
  // Qué falta para poder crear la cuenta: se dice arriba del botón, que queda apagado
  const missing = useMissingFields(
    control,
    {
      firstName: 'Nombre',
      lastName: 'Apellido',
      dateOfBirth: 'Fecha de nacimiento',
      documentNumber: 'Número de documento',
      email: 'Mail',
      phone: 'Teléfono',
      password: 'Contraseña',
    },
    ['dateOfBirth', 'phone'],
  )

  // Con sesión (recién creada o ya abierta) va a la pantalla de su rol ("/")
  if (session.status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  return (
    <AuthShell
      title="Registrarme"
      description="Creá tu cuenta para sumarte al programa y canjear puntos por recompensas"
      panel="narrow"
    >
      <AuthTabs />

      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        {registerCustomer.isSuccess && (
          <Alert variant="success" className="mb-5">
            ¡Listo! Tu cuenta quedó creada con el mail{' '}
            <strong>{registerCustomer.variables.email}</strong>.
            {login.isError &&
              ' No pudimos iniciar tu sesión: entrá desde "Ingresar" con tu mail y contraseña.'}
          </Alert>
        )}

        {generalError && (
          <Alert variant="error" className="mb-5">
            {generalError.status === undefined
              ? generalError.message
              : conflict
                ? generalError.message
                : generalError.status === 400
                  ? 'Revisá los datos: no pudimos crear la cuenta.'
                  : 'No pudimos crear la cuenta. Intentá de nuevo.'}
          </Alert>
        )}

        <AuthFormSection title="Datos personales">
          <FormField
            id="firstName"
            label="Nombre"
            hideRequiredMark
            error={errors.firstName?.message}
          >
            <Input
              autoFocus
              autoComplete="given-name"
              className={authFormStyles.input}
              {...a11y('firstName')}
              {...register('firstName')}
            />
          </FormField>

          <FormField
            id="lastName"
            label="Apellido"
            hideRequiredMark
            error={errors.lastName?.message}
          >
            <Input
              autoComplete="family-name"
              className={authFormStyles.input}
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
            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field }) => (
                <SplitDateInput
                  {...a11y('dateOfBirth')}
                  inputClassName={authFormStyles.input}
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </FormField>
        </AuthFormSection>

        <AuthFormSection title="Documento">
          <SegmentedRadio
            legend="Tipo de documento"
            options={DOCUMENT_OPTIONS}
            compact
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
            hideRequiredMark
            error={errors.documentNumber?.message}
          >
            <Input
              inputMode={isDni ? 'numeric' : 'text'}
              placeholder="30111222"
              autoComplete="off"
              maxLength={isDni ? 10 : 20}
              className={cn(authFormStyles.input, 'max-w-48')}
              {...a11y('documentNumber')}
              {...register('documentNumber')}
            />
          </FormField>
        </AuthFormSection>

        <AuthFormSection title="Contacto">
          <div className="col-span-full">
          <FormField
            id="email"
            label="Mail"
            hideRequiredMark
            error={errors.email?.message}
          >
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              className={authFormStyles.input}
              {...a11y('email')}
              {...register('email')}
            />
          </FormField>
          </div>

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
              maxLength={20}
              className={cn(authFormStyles.input, 'max-w-56')}
              {...a11y('phone')}
              {...register('phone')}
            />
          </FormField>
        </AuthFormSection>

        <AuthFormSection title="Acceso">
          <div className="col-span-full">
            <FormField
              id="password"
              label="Contraseña"
              hideRequiredMark
              // Las reglas ya se ven en la lista de requisitos: el error del campo queda solo
              // para lo que responde el servidor
              error={errors.password?.type ? undefined : errors.password?.message}
              rules={
                <PasswordChecklist
                  id="password-rules"
                  password={password ?? ''}
                  email={email ?? ''}
                  documentNumber={documentNumber}
                />
              }
            >
              <PasswordInput
                autoComplete="new-password"
                className={authFormStyles.passwordInput}
                {...a11y('password')}
                aria-describedby={
                  errors.password && !errors.password.type
                    ? 'password-error password-rules'
                    : 'password-rules'
                }
                {...register('password')}
              />
            </FormField>
          </div>
        </AuthFormSection>

        <p className={authFormStyles.note}>
          Ante cualquier duda o inconveniente, comunicate con el restaurante
        </p>

        <div className={authFormStyles.actions}>
          <SubmitHint id="register-missing" missing={missing} />
          <Button
            loading={submitting}
            type="submit"
            disabled={submitting || missing.length > 0}
            aria-describedby={missing.length > 0 ? 'register-missing' : undefined}
            className="w-full sm:w-auto"
          >
            {registerCustomer.isPending
              ? 'Creando cuenta…'
              : login.isPending
                ? 'Ingresando…'
                : 'Crear cuenta'}
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}
