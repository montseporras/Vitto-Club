import { z } from 'zod'
import { DOCUMENT_TYPE_VALUES } from '@/domain/documents'

// RF-015. Obligatorios: nombre, apellido, tipo y número de documento, correo.
// Largos máximos y reglas iguales a las del dominio Customer del backend.
export const altaClienteSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'Ingresá el nombre')
      .max(80, 'Máximo 80 caracteres'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Ingresá el apellido')
      .max(80, 'Máximo 80 caracteres'),
    documentType: z.enum(DOCUMENT_TYPE_VALUES),
    // Se aceptan puntos, espacios y guiones al tipear ("30.111.222") y se quitan.
    documentNumber: z
      .string()
      .transform((v) => v.replace(/[.\s-]/g, '').toUpperCase())
      .pipe(
        z
          .string()
          .min(1, 'Ingresá el número de documento')
          .max(20, 'Máximo 20 caracteres'),
      ),
    email: z
      .string()
      .trim()
      .min(1, 'Ingresá el correo electrónico')
      .max(150, 'Máximo 150 caracteres')
      .pipe(z.email('Ingresá un correo electrónico válido')),
    // Opcional. Si viene: puede empezar con +, y lleva entre 8 y 15 dígitos.
    phone: z
      .string()
      .trim()
      .max(30, 'Máximo 30 caracteres')
      .regex(/^(\+?[\d\s().-]+)?$/, 'Solo números, espacios, +, -, puntos y paréntesis')
      .refine((v) => {
        if (!v) return true
        const digits = v.replace(/\D/g, '').length
        return digits >= 8 && digits <= 15
      }, 'El teléfono tiene que tener entre 8 y 15 números')
      .optional()
      .transform((v) => v || undefined),
    // RF-015: opcional. El input date entrega 'YYYY-MM-DD'.
    dateOfBirth: z
      .string()
      .optional()
      .superRefine((value, ctx) => {
        if (!value) return
        const date = new Date(value)
        const problem = Number.isNaN(date.getTime())
          ? 'Fecha inválida'
          : date > new Date()
            ? 'La fecha no puede ser futura'
            : date.getFullYear() < 1900
              ? 'Revisá el año de nacimiento'
              : undefined
        if (problem) ctx.addIssue({ code: 'custom', message: problem })
      })
      .transform((v) => v || undefined),
  })
  .superRefine((data, ctx) => {
    if (!data.documentNumber) return
    if (data.documentType === 'DNI' && !/^\d{7,8}$/.test(data.documentNumber)) {
      ctx.addIssue({
        code: 'custom',
        path: ['documentNumber'],
        message: 'El DNI tiene que tener 7 u 8 números',
      })
    }
    if (
      data.documentType === 'PASSPORT' &&
      !/^[A-Z0-9]+$/.test(data.documentNumber)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['documentNumber'],
        message: 'El pasaporte solo puede tener letras y números',
      })
    }
  })

export type AltaClienteFormInput = z.input<typeof altaClienteSchema>
export type AltaClienteFormOutput = z.output<typeof altaClienteSchema>
