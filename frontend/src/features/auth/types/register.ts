// Forma de los datos que viajan a la API cuando un cliente se registra por su cuenta (RF-064).
import type { CreateCustomerBody } from '@/features/cashier'

/** Body de POST /api/auth/register: los datos del alta de cliente (RF-015) más la contraseña. */
export type RegisterCustomerBody = CreateCustomerBody & {
  password: string
}
