import { z } from 'zod'
import { customerFieldsSchema } from '@/features/cashier'

// CLI-ADM (§3.8.2): el Administrador edita nombre, apellido, teléfono y mail, con las mismas
// reglas del alta. El documento no se edita. El motivo es obligatorio: el 400 del backend no
// trae `code`, así que la pantalla lo valida antes de enviar.
export const updateCustomerSchema = customerFieldsSchema
  .pick({ firstName: true, lastName: true, email: true, phone: true })
  .extend({
    reason: z
      .string()
      .trim()
      .min(1, 'Indicá el motivo del cambio para continuar.')
      .max(500, 'El motivo no puede superar los 500 caracteres.'),
  })

export type UpdateCustomerFormInput = z.input<typeof updateCustomerSchema>
export type UpdateCustomerFormOutput = z.output<typeof updateCustomerSchema>
