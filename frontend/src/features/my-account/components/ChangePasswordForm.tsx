import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import type { ApiError } from '@/shared/api/ApiError'
import { useToast } from '@/shared/components/feedback/useToast'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { PasswordInput } from '@/shared/components/ui/PasswordInput'
import { useChangeMyPassword } from '../api/my-account.queries'
import {
  PASSWORD_MESSAGES,
  passwordSchema,
  type PasswordFormValues,
} from '../schemas/password.schema'
import { MY_ACCOUNT_ERROR_CODES } from '../types/my-account'

type PasswordField = keyof PasswordFormValues

const EMPTY: PasswordFormValues = { currentPassword: '', newPassword: '', confirmPassword: '' }

type ChangePasswordFormProps = {
  /** Mail de la cuenta: la nueva no puede ser igual (§3.11). */
  email: string
  /** Documento del cliente, si ya se conoce: la nueva no puede ser igual. */
  documentNumber?: string
  /** Ayuda bajo cada campo (Mi perfil y la ventana de cambio llevan ayudas distintas). */
  hints?: Partial<Record<PasswordField, string>>
  /** Botón secundario a la izquierda de "Cambiar contraseña" (ej. "Ahora no"). */
  secondaryAction?: ReactNode
  onChanged?: () => void
  /** Prefijo de los ids, para que dos formularios en la misma pantalla no choquen. */
  idPrefix: string
}

const FIELDS: { name: PasswordField; label: string; autoComplete: string }[] = [
  { name: 'currentPassword', label: 'Contraseña actual', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'Nueva contraseña', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Confirmar nueva contraseña', autoComplete: 'new-password' },
]

/**
 * Cambio de la contraseña propia (§3.11.1): PATCH /mi-cuenta/password con la
 * actual y la nueva. La confirmación no viaja: la valida solo la pantalla.
 */
export function ChangePasswordForm({
  email,
  documentNumber,
  hints = {},
  secondaryAction,
  onChanged,
  idPrefix,
}: ChangePasswordFormProps) {
  const showToast = useToast()
  const changePassword = useChangeMyPassword()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema({ email, documentNumber })),
    defaultValues: EMPTY,
  })

  // Errores del backend, siempre por `code` (propuesta de PERFIL, §8.2)
  const showServerError = (error: ApiError): boolean => {
    switch (error.code) {
      case MY_ACCOUNT_ERROR_CODES.CURRENT_PASSWORD_INCORRECT:
        setError('currentPassword', { message: PASSWORD_MESSAGES.currentIncorrect })
        return true
      case MY_ACCOUNT_ERROR_CODES.TOO_MANY_ATTEMPTS:
        setError('currentPassword', { message: PASSWORD_MESSAGES.tooManyAttempts })
        return true
      case MY_ACCOUNT_ERROR_CODES.PASSWORD_SAME_AS_CURRENT:
        setError('newPassword', { message: PASSWORD_MESSAGES.sameAsCurrent })
        return true
      case MY_ACCOUNT_ERROR_CODES.PASSWORD_SAME_AS_DOCUMENT:
        setError('newPassword', { message: PASSWORD_MESSAGES.sameAsDocument })
        return true
    }
    // 400 sin code: una regla de la política; el mensaje ya trae el texto del contrato
    if (error.status === 400 && error.messages.length > 0) {
      setError('newPassword', { message: error.messages.join(' ') })
      return true
    }
    return false
  }

  const onSubmit = handleSubmit(({ currentPassword, newPassword }) => {
    changePassword.reset()
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          reset(EMPTY)
          showToast('Contraseña actualizada')
          onChanged?.()
        },
        onError: (error) => {
          if (showServerError(error)) changePassword.reset()
        },
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {changePassword.isError && (
        <Alert variant="error">
          <AlertMessages messages={changePassword.error.messages} />
        </Alert>
      )}

      {FIELDS.map(({ name, label, autoComplete }) => {
        const id = `${idPrefix}-${name}`
        const hint = hints[name]
        return (
          <FormField
            key={name}
            id={id}
            label={label}
            hideRequiredMark
            error={errors[name]?.message}
            hint={hint}
          >
            <PasswordInput
              id={id}
              autoComplete={autoComplete}
              aria-invalid={errors[name] ? true : undefined}
              aria-describedby={errors[name] ? `${id}-error` : hint ? `${id}-hint` : undefined}
              {...register(name)}
            />
          </FormField>
        )
      })}

      <div className="flex flex-wrap justify-end gap-2.5">
        {secondaryAction}
        <Button type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
        </Button>
      </div>
    </form>
  )
}
