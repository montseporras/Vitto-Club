// Validación del modal "Enviar promoción" (US-15, CA-15.2 a CA-15.4), con los mensajes del contrato S5
// §3.7.3. Como en el prototipo: se recorta, la variable inválida se marca en el Mensaje y la fecha se
// pide solo con "Programar". La fecha y hora se toman en hora de Argentina (decisión de Melisa).
import { z } from 'zod'
import { argentinaDateTimeToIso } from '@/shared/lib/dates'
import { firstInvalidVariable, invalidVariableMessage } from '../lib/message-variables'
import { MAX_BODY_LENGTH, MAX_SUBJECT_LENGTH } from './message.schema'

export const PROMOTION_AUDIENCES = ['ALL', 'BRONZE', 'SILVER', 'GOLD'] as const
export type PromotionAudience = (typeof PROMOTION_AUDIENCES)[number]

export const sendPromotionSchema = z
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
    when: z.enum(['NOW', 'SCHEDULED']),
    // Valor del campo datetime-local ('YYYY-MM-DDTHH:mm'); solo cuenta con "Programar"
    scheduledAt: z.string(),
    audience: z.enum(PROMOTION_AUDIENCES),
  })
  .superRefine((form, ctx) => {
    const invalid = firstInvalidVariable('PROMOTION', form.subject, form.body)
    if (invalid) ctx.addIssue({ code: 'custom', path: ['body'], message: invalidVariableMessage(invalid) })

    if (form.when !== 'SCHEDULED') return
    const iso = argentinaDateTimeToIso(form.scheduledAt)
    if (!iso) {
      ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'Elegí la fecha y la hora del envío.' })
    } else if (new Date(iso).getTime() <= Date.now()) {
      ctx.addIssue({
        code: 'custom',
        path: ['scheduledAt'],
        message: 'La fecha y hora tienen que ser posteriores a ahora.',
      })
    }
  })

export type SendPromotionFormValues = z.infer<typeof sendPromotionSchema>
