// "Datos de contacto" de Mi perfil (contrato §3.10.4). Mismas reglas que el
// backend, con los mensajes de la tabla de errores: nunca más estricto.
import { z } from 'zod'
import { displayDateToIso, todayIso } from '@/shared/lib/dates'

export const CONTACT_MESSAGES = {
  required: 'Este campo es obligatorio',
  invalidEmail: 'Ingresá un correo válido, por ejemplo nombre@mail.com',
  // Mismo texto que el alta de clientes (create-customer.schema)
  emailTooLong: 'Máximo 150 caracteres',
  invalidPhone: 'El teléfono tiene que tener entre 8 y 15 números',
  futureDate: 'La fecha no puede ser futura',
  invalidDate: 'Esa fecha no existe',
  passwordForEmail: 'Ingresá tu contraseña actual para cambiar el correo',
} as const

const MIN_BIRTH_YEAR = 1900
const EMAIL_MAX_LENGTH = 150

/** Mismo criterio que el backend para saber si el correo cambió (mayúsculas y espacios no cuentan). */
export const normalizeEmail = (value: string) => value.trim().toLowerCase()

// Hasta 30 caracteres, 8 a 15 dígitos y el + solo al inicio (mismas reglas que clientes)
function isValidPhone(value: string) {
  if (value.length > 30 || !/^\+?[\d\s().-]+$/.test(value)) return false
  const digits = value.replace(/\D/g, '').length
  return digits >= 8 && digits <= 15
}

/** El esquema necesita el correo guardado: si cambia, pide la contraseña actual. */
export const contactSchema = (savedEmail: string) =>
  z
    .object({
      // Todo se valida en superRefine: así los errores de todos los campos se ven juntos
      phone: z.string(),
      email: z.string(),
      // 'DD/MM/AAAA' o vacío
      dateOfBirth: z.string(),
      currentPassword: z.string(),
    })
    .superRefine((form, ctx) => {
      const issue = (path: keyof typeof form, message: string) =>
        ctx.addIssue({ code: 'custom', path: [path], message })

      const phone = form.phone.trim()
      if (phone && !isValidPhone(phone)) issue('phone', CONTACT_MESSAGES.invalidPhone)

      const email = form.email.trim()
      if (!email) issue('email', CONTACT_MESSAGES.required)
      else if (email.length > EMAIL_MAX_LENGTH) issue('email', CONTACT_MESSAGES.emailTooLong)
      else if (!z.email().safeParse(email).success)
        issue('email', CONTACT_MESSAGES.invalidEmail)

      const date = form.dateOfBirth.trim()
      if (date) {
        const iso = displayDateToIso(date)
        if (!iso || Number(iso.slice(0, 4)) < MIN_BIRTH_YEAR)
          issue('dateOfBirth', CONTACT_MESSAGES.invalidDate)
        else if (iso > todayIso()) issue('dateOfBirth', CONTACT_MESSAGES.futureDate)
      }

      const emailChanged = normalizeEmail(email) !== normalizeEmail(savedEmail)
      if (email && emailChanged && !form.currentPassword) {
        issue('currentPassword', CONTACT_MESSAGES.passwordForEmail)
      }
    })

export type ContactFormValues = z.infer<ReturnType<typeof contactSchema>>
