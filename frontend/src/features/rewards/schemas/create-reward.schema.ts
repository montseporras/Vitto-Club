import { z } from 'zod'
import type { CreateRewardBody } from '../types/reward'

export const REWARD_MESSAGES = {
  required: 'Completá este campo.',
  invalidPoints: 'Ingresá un número entero mayor a 0.',
  maxPoints: 'El máximo es 1.000.000 puntos.',
  invalidStock: 'Ingresá un número entero mayor a 0.',
  integerStock: 'Ingresá un número entero, sin decimales.',
  maxStock: 'El máximo es 100.000.',
  stockRequired: 'Completá este campo o marcá «Sin límite de stock».',
  expirationRequired: 'Elegí una fecha o marcá «No vence».',
  expirationInPast: 'La fecha no puede ser anterior a hoy.',
} as const

export function createRewardSchema(today: string) {
  return z
    .object({
      name: z.string().trim(),
      description: z.string().trim(),
      points: z.string().trim(),
      stock: z.string().trim(),
      unlimitedStock: z.boolean(),
      expiresAt: z.string(),
      noExpiry: z.boolean(),
    })
    .superRefine((values, context) => {
      if (!values.name) {
        context.addIssue({
          code: 'custom',
          path: ['name'],
          message: REWARD_MESSAGES.required,
        })
      } else if (values.name.length > 80) {
        context.addIssue({
          code: 'custom',
          path: ['name'],
          message: 'Máximo 80 caracteres.',
        })
      }

      if (values.description.length > 255) {
        context.addIssue({
          code: 'custom',
          path: ['description'],
          message: 'Máximo 255 caracteres.',
        })
      }

      if (!values.points) {
        context.addIssue({
          code: 'custom',
          path: ['points'],
          message: REWARD_MESSAGES.required,
        })
      } else if (!/^\d+$/.test(values.points) || Number(values.points) < 1) {
        context.addIssue({
          code: 'custom',
          path: ['points'],
          message: REWARD_MESSAGES.invalidPoints,
        })
      } else if (Number(values.points) > 1_000_000) {
        context.addIssue({
          code: 'custom',
          path: ['points'],
          message: REWARD_MESSAGES.maxPoints,
        })
      }

      if (!values.unlimitedStock) {
        if (!values.stock) {
          context.addIssue({
            code: 'custom',
            path: ['stock'],
            message: REWARD_MESSAGES.stockRequired,
          })
        } else if (!/^-?\d+$/.test(values.stock)) {
          context.addIssue({
            code: 'custom',
            path: ['stock'],
            message: REWARD_MESSAGES.integerStock,
          })
        } else if (Number(values.stock) < 1) {
          context.addIssue({
            code: 'custom',
            path: ['stock'],
            message: REWARD_MESSAGES.invalidStock,
          })
        } else if (Number(values.stock) > 100_000) {
          context.addIssue({
            code: 'custom',
            path: ['stock'],
            message: REWARD_MESSAGES.maxStock,
          })
        }
      }

      if (!values.noExpiry) {
        if (!values.expiresAt) {
          context.addIssue({
            code: 'custom',
            path: ['expiresAt'],
            message: REWARD_MESSAGES.expirationRequired,
          })
        } else if (values.expiresAt < today) {
          context.addIssue({
            code: 'custom',
            path: ['expiresAt'],
            message: REWARD_MESSAGES.expirationInPast,
          })
        }
      }
    })
    .transform(
      (values): CreateRewardBody => ({
        name: values.name,
        description: values.description || null,
        points: Number(values.points),
        stock: values.unlimitedStock ? null : Number(values.stock),
        expiresAt: values.noExpiry ? null : values.expiresAt,
      }),
    )
}

export type CreateRewardFormInput = z.input<ReturnType<typeof createRewardSchema>>
export type CreateRewardFormOutput = z.output<ReturnType<typeof createRewardSchema>>
