import { z } from 'zod'

// Máximo del backend (contrato §3.1.2): la pantalla no puede ser más estricta.
const MAX_AMOUNT = 9999999999.99

export const AMOUNT_MESSAGES = {
  required: 'Ingresá el monto del consumo.',
  format: 'Formato inválido. Usá solo números, por ejemplo 50.000 o 12.500,50.',
  positive: 'El monto debe ser mayor a 0.',
  max: 'Ingresá un monto válido menor a 9999999999.',
}

export const NOTES_MAX_LENGTH = 255

type ParsedAmount = { amount: number } | { error: string }

/**
 * Convierte lo que se escribe en el monto a número (regla `parse()` del prototipo).
 * Acepta 50000, 50.000, 12500,50 y 12.500,50.
 */
export function parseAmount(raw: string): ParsedAmount {
  let text = raw.replace(/[\s$]/g, '')
  if (!text) return { error: AMOUNT_MESSAGES.required }
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, '')
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) return { error: AMOUNT_MESSAGES.format }
  const amount = parseFloat(text)
  if (!(amount > 0)) return { error: AMOUNT_MESSAGES.positive }
  if (amount > MAX_AMOUNT) return { error: AMOUNT_MESSAGES.max }
  return { amount }
}

export const consumptionSchema = z.object({
  amount: z.string().transform((value, ctx) => {
    const parsed = parseAmount(value)
    if ('error' in parsed) {
      ctx.addIssue({ code: 'custom', message: parsed.error })
      return z.NEVER
    }
    return parsed.amount
  }),
})

export type ConsumptionFormInput = z.input<typeof consumptionSchema>
export type ConsumptionFormOutput = z.output<typeof consumptionSchema>
