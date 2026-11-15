// Validación de "Puntos de regalo por cumpleaños" (US-14, CA-14.1b, contrato S5 §3.6.2): entero de 0 a
// 10.000. Como en el prototipo, acepta el separador de miles ("1.000").
import { z } from 'zod'

export const MAX_BIRTHDAY_POINTS = 10_000

const BIRTHDAY_POINTS_MESSAGE = 'Ingresá puntos enteros de 0 a 10.000.'

export const birthdayPointsSchema = z
  .string()
  .transform((value) => value.trim().replace(/\./g, ''))
  .refine((digits) => /^\d+$/.test(digits), BIRTHDAY_POINTS_MESSAGE)
  .transform(Number)
  .refine((points) => points <= MAX_BIRTHDAY_POINTS, BIRTHDAY_POINTS_MESSAGE)
