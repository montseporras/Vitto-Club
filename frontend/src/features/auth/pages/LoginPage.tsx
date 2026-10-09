import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Page, PageCard } from '@/shared/components/ui/Page'
import { PasswordInput } from '@/shared/components/ui/PasswordInput'
import { useLogin } from '../api/auth.queries'
import { AuthTabs } from '../components/AuthTabs'
import {
  loginSchema,
  type LoginFormInput,
  type LoginFormOutput,
} from '../schemas/login.schema'
import { useSession } from '../session'
import { AUTH_ERROR_CODES } from '../types/auth'

const INITIAL_VALUES: LoginFormInput = { email: '', password: '' }

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
        <AuthTabs />

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
      </PageCard>
    </Page>
  )
}
