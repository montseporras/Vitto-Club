import { z } from 'zod'

export const MAX_LEVEL_MIN_POINTS = 2_147_483_647
// Mismo texto que devuelve el backend (US-27)
export const MAX_LEVEL_MIN_POINTS_MESSAGE =
  'Ingresá un número menor o igual a 2.147.483.647.'

export const loyaltyLevelsSchema = z
  .object({
    silverMinPoints: z
      .number({ message: 'Completá este campo.' })
      .int('Ingresá un número entero, sin decimales.')
      .min(1, 'El umbral de Plata debe ser mayor que 0')
      .max(MAX_LEVEL_MIN_POINTS, MAX_LEVEL_MIN_POINTS_MESSAGE),
    goldMinPoints: z
      .number({ message: 'Completá este campo.' })
      .int('Ingresá un número entero, sin decimales.')
      .max(MAX_LEVEL_MIN_POINTS, MAX_LEVEL_MIN_POINTS_MESSAGE),
  })
  .superRefine(({ silverMinPoints, goldMinPoints }, context) => {
    if (
      Number.isInteger(silverMinPoints) &&
      Number.isInteger(goldMinPoints) &&
      goldMinPoints <= silverMinPoints
    ) {
      context.addIssue({
        code: 'custom',
        path: ['goldMinPoints'],
        message: 'El umbral de Oro debe ser mayor que el de Plata',
      })
    }
  })

export type LoyaltyLevelsFormValues = z.infer<typeof loyaltyLevelsSchema>
