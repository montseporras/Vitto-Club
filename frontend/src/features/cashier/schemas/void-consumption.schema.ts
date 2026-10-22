import { z } from 'zod'

/** Largo máximo del motivo (contrato §3.2.2); lo limita el textarea. */
export const VOID_REASON_MAX_LENGTH = 500

// Mensajes del contrato §3.2.2. El largo máximo no se valida acá: el textarea
// ya no deja pasar de 500 caracteres.
export const voidConsumptionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'El motivo de anulación es obligatorio.')
    .min(5, 'Indicá un motivo de al menos 5 caracteres.'),
})

export type VoidConsumptionFormInput = z.input<typeof voidConsumptionSchema>
export type VoidConsumptionFormOutput = z.output<typeof voidConsumptionSchema>
