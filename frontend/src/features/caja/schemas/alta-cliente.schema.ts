import { z } from 'zod'
import { TIPOS_DOCUMENTO_VALUES } from '@/domain/documentos'

// RF-015. Obligatorios: nombre, apellido, tipo y número de documento, correo.
// Largos máximos iguales a las columnas de la tabla `clientes`.
export const altaClienteSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, 'Ingresá el nombre')
      .max(80, 'Máximo 80 caracteres'),
    apellido: z
      .string()
      .trim()
      .min(1, 'Ingresá el apellido')
      .max(80, 'Máximo 80 caracteres'),
    tipoDocumento: z.enum(TIPOS_DOCUMENTO_VALUES),
    // Se aceptan puntos, espacios y guiones al tipear ("30.111.222") y se quitan.
    numeroDocumento: z
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
    telefono: z
      .string()
      .trim()
      .max(30, 'Máximo 30 caracteres')
      .regex(/^[\d\s()+-]*$/, 'Solo números, espacios, +, - y paréntesis')
      .transform((v) => v || undefined),
  })
  .superRefine((data, ctx) => {
    if (!data.numeroDocumento) return
    if (data.tipoDocumento === 'DNI' && !/^\d{7,8}$/.test(data.numeroDocumento)) {
      ctx.addIssue({
        code: 'custom',
        path: ['numeroDocumento'],
        message: 'El DNI tiene que tener 7 u 8 números',
      })
    }
    if (
      data.tipoDocumento === 'PASAPORTE' &&
      !/^[A-Z0-9]+$/.test(data.numeroDocumento)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['numeroDocumento'],
        message: 'El pasaporte solo puede tener letras y números',
      })
    }
  })

export type AltaClienteFormInput = z.input<typeof altaClienteSchema>
export type AltaClienteFormOutput = z.output<typeof altaClienteSchema>
