// Validación del motivo de la ventana "Rechazar canje" (US-43, CA-43.2), con las mismas reglas y
// mensajes que el backend (contrato §3.10.1): se recorta y tiene que tener de 5 a 500 caracteres.
import { z } from 'zod'

export const REJECTION_REASON_MAX_LENGTH = 500

export const rejectRedemptionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'El motivo es obligatorio.')
    .min(5, 'Indicá un motivo de al menos 5 caracteres.')
    .max(REJECTION_REASON_MAX_LENGTH, 'El motivo no puede superar los 500 caracteres.'),
})

export type RejectRedemptionFormInput = z.input<typeof rejectRedemptionSchema>
export type RejectRedemptionFormOutput = z.output<typeof rejectRedemptionSchema>
