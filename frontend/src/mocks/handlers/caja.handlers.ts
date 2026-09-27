import { delay, http, HttpResponse } from 'msw'
import type { Client, CreateClientBody } from '@/features/caja'
import { API_URL } from '@/shared/api/http'

// Mismos clientes que backend/prisma/seed.ts, para probar el documento duplicado.
const clients: Client[] = [
  {
    id: 1,
    firstName: 'Lucía',
    lastName: 'Fernández',
    documentType: 'DNI',
    documentNumber: '40123456',
    phone: '3511111111',
    email: 'lucia@example.com',
    dateOfBirth: '1998-05-14',
    active: true,
    deactivatedAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    firstName: 'Martín',
    lastName: 'Suárez',
    documentType: 'DNI',
    documentNumber: '38987654',
    phone: '3512222222',
    email: 'martin@example.com',
    dateOfBirth: null,
    active: true,
    deactivatedAt: null,
    createdAt: new Date().toISOString(),
  },
]

// Mismo formato que CustomerExceptionFilter del backend.
const errorResponse = (
  statusCode: 400 | 409,
  message: string | string[],
  path: string,
) =>
  HttpResponse.json(
    {
      statusCode,
      error: statusCode === 400 ? 'Bad Request' : 'Conflict',
      message,
      path,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode },
  )

export const cajaHandlers = [
  // RF-015: POST /api/customers responde 201 / 400 / 409.
  http.post<never, CreateClientBody>(
    `${API_URL}/customers`,
    async ({ request }) => {
      await delay(400)
      const body = await request.json()
      const path = new URL(request.url).pathname

      const missing = (
        [
          'firstName',
          'lastName',
          'documentType',
          'documentNumber',
          'email',
        ] as const
      ).filter((field) => !body[field])
      if (missing.length) {
        return errorResponse(
          400,
          missing.map((field) => `${field} should not be empty`),
          path,
        )
      }

      const exists = clients.some(
        (client) =>
          client.documentType === body.documentType &&
          client.documentNumber === body.documentNumber,
      )
      if (exists) {
        return errorResponse(
          409,
          `Customer with ${body.documentType} "${body.documentNumber}" already exists. ` +
            'If that customer is inactive, reactivate it instead of creating a new one',
          path,
        )
      }

      const created: Client = {
        id: clients.length + 1,
        ...body,
        phone: body.phone ?? null,
        dateOfBirth: body.dateOfBirth ?? null,
        active: true,
        deactivatedAt: null,
        createdAt: new Date().toISOString(),
      }
      clients.push(created)
      return HttpResponse.json(created, { status: 201 })
    },
  ),
]
