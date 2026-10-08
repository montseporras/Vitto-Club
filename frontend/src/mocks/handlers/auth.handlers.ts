// Simula en desarrollo la API de acceso (registro de clientes) para probar el formulario sin backend.
import { delay, http, HttpResponse } from 'msw'
import type { RegisterCustomerBody } from '@/features/auth'
import type { Customer } from '@/features/cashier'
import { API_URL } from '@/shared/api/http'
import { customers, errorResponse } from './cashier.handlers'

export const authHandlers = [
  // RF-064: POST /api/auth/register responde 201 / 400 / 409.
  http.post<never, RegisterCustomerBody>(
    `${API_URL}/auth/register`,
    async ({ request }) => {
      await delay(400)
      const { password, ...data } = await request.json()
      const path = new URL(request.url).pathname

      const missing = (
        [
          'firstName',
          'lastName',
          'documentType',
          'documentNumber',
          'email',
        ] as const
      ).filter((field) => !data[field])
      if (missing.length || !password) {
        return errorResponse(
          400,
          [...missing, ...(password ? [] : ['password'])].map(
            (field) => `${field} should not be empty`,
          ),
          path,
        )
      }

      // Mismos mensajes que CustomerAlreadyExists del backend.
      const documentTaken = customers.some(
        (customer) =>
          customer.documentType === data.documentType &&
          customer.documentNumber === data.documentNumber,
      )
      if (documentTaken) {
        return errorResponse(
          409,
          `Customer with ${data.documentType} "${data.documentNumber}" already exists. ` +
            'If that customer is inactive, reactivate it instead of creating a new one',
          path,
        )
      }
      const email = data.email.toLowerCase()
      if (customers.some((customer) => customer.email.toLowerCase() === email)) {
        return errorResponse(
          409,
          `Customer with email "${email}" already exists. ` +
            'If that customer is inactive, reactivate it instead of creating a new one',
          path,
        )
      }

      // La contraseña no se guarda ni se devuelve. El cliente queda visible para la caja.
      const created: Customer = {
        id: customers.length + 1,
        ...data,
        email,
        phone: data.phone ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        active: true,
        deactivatedAt: null,
        createdAt: new Date().toISOString(),
      }
      customers.push(created)
      return HttpResponse.json(created, { status: 201 })
    },
  ),
]
