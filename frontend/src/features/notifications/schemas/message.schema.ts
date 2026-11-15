// Validación del modal "Mensaje: {tipo}" (US-14, CA-14.2), con los mensajes del contrato S5 §3.6.2.
// Igual que el prototipo: se recorta antes de validar y la variable inválida se marca en el Mensaje.
import { z } from 'zod'
import { firstInvalidVariable, invalidVariableMessage } from '../lib/message-variables'
import type { NotificationType } from '../types/notifications'

export const MAX_SUBJECT_LENGTH = 120
export const MAX_BODY_LENGTH = 1000

export const messageSchema = (type: NotificationType) =>
  z
    .object({
      subject: z
        .string()
        .trim()
        .min(1, 'El asunto es obligatorio.')
        .max(MAX_SUBJECT_LENGTH, 'El asunto no puede superar los 120 caracteres.'),
      body: z
        .string()
        .trim()
        .min(1, 'El mensaje es obligatorio.')
        .max(MAX_BODY_LENGTH, 'El mensaje no puede superar los 1.000 caracteres.'),
    })
    .superRefine((form, ctx) => {
      const invalid = firstInvalidVariable(type, form.subject, form.body)
      if (invalid) {
        ctx.addIssue({ code: 'custom', path: ['body'], message: invalidVariableMessage(invalid) })
      }
    })

export type MessageFormValues = z.infer<ReturnType<typeof messageSchema>>
