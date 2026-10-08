// Reglas de validación del formulario "Registrarme": reusa las del alta de cliente en caja (RF-015) y les suma la contraseña (RF-064).
import { z } from 'zod'
import { createCustomerSchema } from '@/features/cashier'

// bcrypt (backend) solo mira los primeros 72 bytes, y una letra con tilde o una eñe ocupan 2.
const byteLength = (value: string) => new TextEncoder().encode(value).length

// Mismas reglas que aplica el backend al crear una cuenta (docs/auth-api.md).
// La contraseña no se recorta: los espacios cuentan y las mayúsculas importan.
export const registerSchema = createCustomerSchema
  .safeExtend({
    password: z
      .string()
      .min(1, 'Ingresá una contraseña')
      .min(8, 'La contraseña tiene que tener al menos 8 caracteres')
      .max(64, 'Máximo 64 caracteres')
      .refine(
        (value) => byteLength(value) <= 72,
        'La contraseña es demasiado larga: probá con menos tildes o eñes',
      ),
  })
  .superRefine((data, ctx) => {
    if (data.password && data.password === data.email) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'La contraseña no puede ser igual al mail',
      })
    }
  })

export type RegisterFormInput = z.input<typeof registerSchema>
export type RegisterFormOutput = z.output<typeof registerSchema>
