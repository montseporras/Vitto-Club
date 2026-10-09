import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import { ROLES, type Role } from '@/domain/roles'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Page, PageCard } from '@/shared/components/ui/Page'
import { PasswordInput } from '@/shared/components/ui/PasswordInput'
import { MOCKS_ENABLED } from '@/shared/lib/env'
import { dividedSectionStyles, eyebrowStyles } from '@/styles/ui'
import { useLogin } from '../api/auth.queries'
import {
  loginSchema,
  type LoginFormInput,
  type LoginFormOutput,
} from '../schemas/login.schema'
import { useSession } from '../session'
import { AUTH_ERROR_CODES } from '../types/auth'

const INITIAL_VALUES: LoginFormInput = { email: '', password: '' }

// Cuentas de src/mocks/handlers/auth.handlers.ts: solo se ofrecen con los mocks
const DEMO_PASSWORD = 'vitto2026'
const DEMO_ACCOUNTS: { role: Role; email: string }[] = [
  { role: 'CUSTOMER', email: 'lucia@example.com' },
  { role: 'CASHIER', email: 'bruno.perez@vitto.club' },
  { role: 'ADMIN', email: 'ana.gomez@vitto.club' },
]

/** RF-059: un solo ingreso, con mail y contraseña, para clientes, cajeros y administradores. */
export function LoginPage() {
  const session = useSession()
  const location = useLocation()
  const login = useLogin()
  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormInput, unknown, LoginFormOutput>({
    resolver: zodResolver(loginSchema),
    defaultValues: INITIAL_VALUES,
    mode: 'onTouched',
  })

  // Al recargar con la sesión abierta, no muestra el formulario mientras la recupera
  if (session.status === 'restoring') {
    return <StatusText className="text-center">Cargando…</StatusText>
  }

  // Con sesión, vuelve a la pantalla que se quiso abrir o a la de su rol ("/")
  if (session.status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/'} replace />
  }

  const onSubmit = (data: LoginFormOutput) => {
    login.mutate(data, {
      onError: (error) => {
        if (error.code === AUTH_ERROR_CODES.INVALID_CREDENTIALS) {
          setValue('password', '')
          setFocus('password')
        }
      },
    })
  }

  const fillDemoAccount = (email: string) => {
    login.reset()
    setValue('email', email, { shouldValidate: true })
    setValue('password', DEMO_PASSWORD, { shouldValidate: true })
  }

  const a11y = (field: keyof LoginFormInput) => ({
    id: field,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  })

  const error = login.error

  return (
    <Page>
      {error && (
        <Alert variant="error" className="mb-5">
          {error.code === AUTH_ERROR_CODES.INVALID_CREDENTIALS ? (
            'Los datos de acceso son incorrectos.'
          ) : error.status === 400 ? (
            <>
              Revisá los datos ingresados.
              <AlertMessages messages={error.messages} />
            </>
          ) : (
            <>
              No se pudo iniciar sesión.
              <AlertMessages messages={error.messages} />
            </>
          )}
        </Alert>
      )}

      <PageCard
        eyebrow="Vitto Club"
        title="Ingresar"
      >
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-w-md flex-col gap-5"
        >
          <FormField id="email" label="Mail" error={errors.email?.message}>
            <Input
              type="email"
              autoFocus
              autoComplete="username"
              placeholder="nombre@mail.com"
              {...a11y('email')}
              {...register('email')}
            />
          </FormField>

          <FormField
            id="password"
            label="Contraseña"
            error={errors.password?.message}
          >
            <PasswordInput
              autoComplete="current-password"
              placeholder="••••••••"
              {...a11y('password')}
              {...register('password')}
            />
          </FormField>

          <Button
            type="submit"
            size="lg"
            className="self-start"
            disabled={login.isPending}
          >
            {login.isPending ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>

        {MOCKS_ENABLED && (
          <div className={dividedSectionStyles}>
            <p className={eyebrowStyles}>Cuentas de prueba</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {DEMO_ACCOUNTS.map(({ role, email }) => (
                <Button
                  key={email}
                  type="button"
                  variant="secondary"
                  onClick={() => fillDemoAccount(email)}
                >
                  {ROLES[role]} · {email}
                </Button>
              ))}
            </div>
          </div>
        )}
      </PageCard>
    </Page>
  )
}
