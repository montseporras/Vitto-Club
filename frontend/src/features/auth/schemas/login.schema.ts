import { z } from 'zod'

// Mismos límites que LoginDto del backend. El formato del mail no se valida:
// cualquier dato incorrecto termina en el mismo "datos de acceso incorrectos".
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Ingresá tu mail')
    .max(150, 'El mail no puede superar los 150 caracteres'),
  password: z
    .string()
    .min(1, 'Ingresá tu contraseña')
    .max(64, 'La contraseña no puede superar los 64 caracteres'),
})

export type LoginFormInput = z.input<typeof loginSchema>
export type LoginFormOutput = z.output<typeof loginSchema>
