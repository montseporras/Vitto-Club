import { z } from 'zod'

// Tope de la cantidad (contrato §3.5.1)
export const MAX_ADJUSTMENT_POINTS = 1_000_000

// US-24 (§3.5.1). Mensajes del contrato; el del máximo es nuevo (decisión de Melisa: el
// contrato fija el tope pero no da texto). El motivo no necesita mensaje de largo máximo: el
// textarea no deja escribir más de 500 caracteres.
export const adjustPointsSchema = z.object({
  direction: z.enum(['ADD', 'SUBTRACT']),
  points: z
    .string()
    .trim()
    .min(1, 'Ingresá la cantidad de puntos.')
    .regex(/^\d+$/, 'Tiene que ser un número entero mayor a 0.')
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .positive('Tiene que ser un número entero mayor a 0.')
        .max(MAX_ADJUSTMENT_POINTS, 'El máximo es 1.000.000 puntos.'),
    ),
  reason: z.string().trim().min(1, 'El motivo es obligatorio.').max(500),
})

export type AdjustPointsFormInput = z.input<typeof adjustPointsSchema>
export type AdjustPointsFormOutput = z.output<typeof adjustPointsSchema>
