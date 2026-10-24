// Cambio de contraseña propia (contrato §3.11 y §3.11.1). Mismas reglas y
// mensajes que el backend, en el orden de su tabla: nunca más estricto. La
// confirmación la valida solo la pantalla.
import { z } from 'zod'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/shared/lib/password'

export const PASSWORD_MESSAGES = {
  required: 'Este campo es obligatorio',
  length: 'Tiene que tener entre 8 y 64 caracteres',
  tooLong: 'La contraseña es demasiado larga',
  sameAsEmail: 'La contraseña no puede ser igual al mail',
  sameAsCurrent: 'La nueva contraseña no puede ser igual a la actual',
  sameAsDocument: 'La contraseña no puede ser tu número de documento',
  currentIncorrect: 'La contraseña actual es incorrecta',
  mismatch: 'Las contraseñas no coinciden',
  tooManyAttempts: 'Hiciste demasiados intentos. Probá de nuevo en unos minutos.',
} as const

const MAX_BYTES = 72

// Igual que normalizeDocumentNumber del backend
const normalizeDocument = (value: string) => value.replace(/[\s.-]/g, '').toUpperCase()

type PasswordContext = {
  /** Mail de la cuenta (comparación literal, como el backend). */
  email: string
  /** Documento del cliente, si ya se conoce. Si no, la regla la valida el backend. */
  documentNumber?: string
}

export const passwordSchema = ({ email, documentNumber }: PasswordContext) =>
  z
    .object({
      // Todo se valida en superRefine: así los errores de los tres campos se ven juntos
      currentPassword: z.string(),
      newPassword: z.string(),
      confirmPassword: z.string(),
    })
    .superRefine((form, ctx) => {
      const issue = (path: keyof typeof form, message: string) =>
        ctx.addIssue({ code: 'custom', path: [path], message })
      const { newPassword } = form

      if (!form.currentPassword) issue('currentPassword', PASSWORD_MESSAGES.required)

      // Política de §3.11: se informa la primera regla que no se cumple
      if (!newPassword) issue('newPassword', PASSWORD_MESSAGES.required)
      else if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH)
        issue('newPassword', PASSWORD_MESSAGES.length)
      else if (new TextEncoder().encode(newPassword).length > MAX_BYTES)
        issue('newPassword', PASSWORD_MESSAGES.tooLong)
      else if (newPassword === email) issue('newPassword', PASSWORD_MESSAGES.sameAsEmail)
      else if (newPassword === form.currentPassword)
        issue('newPassword', PASSWORD_MESSAGES.sameAsCurrent)
      else if (documentNumber && newPassword === normalizeDocument(documentNumber))
        issue('newPassword', PASSWORD_MESSAGES.sameAsDocument)

      if (!form.confirmPassword) issue('confirmPassword', PASSWORD_MESSAGES.required)
      else if (newPassword && form.confirmPassword !== newPassword) {
        issue('confirmPassword', PASSWORD_MESSAGES.mismatch)
      }
    })

export type PasswordFormValues = z.infer<ReturnType<typeof passwordSchema>>
