import { z } from 'zod'
import type { CreateMissionBody } from '../types/mission'

const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7]

function parseLocalizedTarget(value: string) {
  const trimmed = value.trim().replace(/\s/g, '')
  const validFormat =
    /^\d+(?:,\d+)?$/.test(trimmed) ||
    /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(trimmed)
  if (!validFormat) return null
  const number = Number(trimmed.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(number) ? number : null
}

function parseRewardPoints(value: string) {
  const trimmed = value.trim().replace(/\./g, '')
  if (!/^\d+$/.test(trimmed)) return null
  return Number(trimmed)
}

export function createMissionSchema(
  currentMonth: string,
  lockedStartMonth?: string | null,
) {
  return z
    .object({
      name: z.string(),
      description: z.string(),
      objectiveType: z.enum(['CONSUMPTION_COUNT', 'CONSUMPTION_AMOUNT']),
      target: z.string(),
      allDays: z.boolean(),
      daysOfWeek: z.array(z.number()),
      timeFrom: z.string(),
      timeTo: z.string(),
      rewardPointsInput: z.string(),
      noReward: z.boolean(),
      startMonth: z.string(),
      endMonth: z.string(),
      repeats: z.boolean(),
    })
    .superRefine((values, context) => {
      const name = values.name.trim()
      if (!name) {
        context.addIssue({
          code: 'custom',
          path: ['name'],
          message: 'El nombre es obligatorio.',
        })
      } else if (name.length > 80) {
        context.addIssue({
          code: 'custom',
          path: ['name'],
          message: 'El nombre no puede superar los 80 caracteres.',
        })
      }

      if (values.description.length > 255) {
        context.addIssue({
          code: 'custom',
          path: ['description'],
          message: 'La descripción no puede superar los 255 caracteres.',
        })
      }

      const target = parseLocalizedTarget(values.target)
      const maximum =
        values.objectiveType === 'CONSUMPTION_COUNT' ? 100 : 1_000_000
      if (target === null || target <= 0) {
        context.addIssue({
          code: 'custom',
          path: ['target'],
          message: 'Ingresá un objetivo mayor a 0.',
        })
      } else if (
        values.objectiveType === 'CONSUMPTION_COUNT' &&
        !Number.isInteger(target)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['target'],
          message: 'Ingresá un número entero.',
        })
      } else if (target > maximum) {
        context.addIssue({
          code: 'custom',
          path: ['target'],
          message: `El objetivo máximo es ${maximum.toLocaleString('es-AR')}.`,
        })
      }

      if (!values.allDays) {
        const validDays = values.daysOfWeek.every((day) => DAY_NUMBERS.includes(day))
        if (!values.daysOfWeek.length || !validDays) {
          context.addIssue({
            code: 'custom',
            path: ['daysOfWeek'],
            message: 'Elegí al menos un día o marcá «Todos los días».',
          })
        }
      }

      if (Boolean(values.timeFrom) !== Boolean(values.timeTo)) {
        context.addIssue({
          code: 'custom',
          path: ['timeFrom'],
          message: 'Completá las dos horas o ninguna.',
        })
      } else if (values.timeFrom && values.timeFrom >= values.timeTo) {
        context.addIssue({
          code: 'custom',
          path: ['timeFrom'],
          message: 'La hora de inicio tiene que ser anterior a la de fin.',
        })
      }

      if (lockedStartMonth && values.startMonth !== lockedStartMonth) {
        context.addIssue({
          code: 'custom',
          path: ['startMonth'],
          message: 'La misión ya empezó: no se puede cambiar el mes de inicio.',
        })
      } else if (!lockedStartMonth && values.startMonth < currentMonth) {
        context.addIssue({
          code: 'custom',
          path: ['startMonth'],
          message: 'El mes de inicio no puede ser anterior al mes actual.',
        })
      }

      const endMonth = values.endMonth || values.startMonth
      if (!values.repeats && endMonth < values.startMonth) {
        context.addIssue({
          code: 'custom',
          path: ['endMonth'],
          message: 'El mes de fin no puede ser anterior al de inicio.',
        })
      }

      if (!values.noReward) {
        const rewardPoints = parseRewardPoints(values.rewardPointsInput)
        if (rewardPoints === null || rewardPoints < 1) {
          context.addIssue({
            code: 'custom',
            path: ['rewardPointsInput'],
            message: 'Ingresá puntos enteros mayores a 0.',
          })
        } else if (rewardPoints > 100_000) {
          context.addIssue({
            code: 'custom',
            path: ['rewardPointsInput'],
            message: 'El máximo es 100.000 puntos.',
          })
        }
      }
    })
    .transform(
      (values): CreateMissionBody => ({
        name: values.name.trim(),
        description: values.description.trim(),
        objectiveType: values.objectiveType,
        target: parseLocalizedTarget(values.target) ?? 0,
        daysOfWeek: values.allDays ? null : values.daysOfWeek.slice().sort((a, b) => a - b),
        timeFrom: values.timeFrom || null,
        timeTo: values.timeTo || null,
        rewardPoints: values.noReward
          ? null
          : parseRewardPoints(values.rewardPointsInput),
        startMonth: values.startMonth,
        endMonth: values.repeats
          ? null
          : values.endMonth || values.startMonth,
      }),
    )
}

export type CreateMissionFormInput = z.input<ReturnType<typeof createMissionSchema>>
export type CreateMissionFormOutput = z.output<ReturnType<typeof createMissionSchema>>
