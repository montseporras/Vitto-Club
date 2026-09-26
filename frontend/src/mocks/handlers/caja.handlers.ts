import { delay, http, HttpResponse } from 'msw'
import type {
  Client,
  CreateClientBody,
  UpdateClientBody,
} from '@/features/caja'
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
  // Dado de baja: sirve para probar que no se puede editar (409)
  {
    id: 3,
    firstName: 'Carlos',
    lastName: 'Ruiz',
    documentType: 'DNI',
    documentNumber: '27555444',
    phone: null,
    email: 'carlos@example.com',
    dateOfBirth: '1979-11-02',
    active: false,
    deactivatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
]

const STATUS_NAMES = { 400: 'Bad Request', 404: 'Not Found', 409: 'Conflict' }

// Mismo formato que CustomerExceptionFilter del backend.
const errorResponse = (
  statusCode: 400 | 404 | 409,
  message: string | string[],
  path: string,
) =>
  HttpResponse.json(
    {
      statusCode,
      error: STATUS_NAMES[statusCode],
      message,
      path,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode },
  )

// Igual que normalizeDocumentNumber del backend
const normalizeDocument = (value: string) =>
  value.replace(/[\s.-]/g, '').toUpperCase()

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

  // GET /api/customers/by-document: 200 con el cliente (activo o no) o 404.
  http.get(`${API_URL}/customers/by-document`, async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const documentType = url.searchParams.get('documentType') ?? 'DNI'
    const documentNumber = normalizeDocument(
      url.searchParams.get('documentNumber') ?? '',
    )
    const client = clients.find(
      (c) =>
        c.documentType === documentType && c.documentNumber === documentNumber,
    )
    if (!client) {
      return errorResponse(
        404,
        `Customer with ${documentType} "${documentNumber}" not found`,
        url.pathname,
      )
    }
    return HttpResponse.json(client)
  }),

  // PATCH /api/customers/:id: 200 / 400 (sin cambios) / 404 / 409 (inactivo o documento en uso).
  http.patch<{ id: string }, UpdateClientBody>(
    `${API_URL}/customers/:id`,
    async ({ params, request }) => {
      await delay(400)
      const path = new URL(request.url).pathname
      const body = await request.json()
      const client = clients.find((c) => c.id === Number(params.id))

      if (!client) {
        return errorResponse(404, `Customer with ID ${params.id} not found`, path)
      }
      if (Object.values(body).every((value) => value === undefined)) {
        return errorResponse(400, 'At least one field must be provided', path)
      }
      if (!client.active) {
        return errorResponse(
          409,
          `Customer with ID ${client.id} is inactive: reactivate it before modifying`,
          path,
        )
      }

      const documentType = body.documentType ?? client.documentType
      const documentNumber = body.documentNumber
        ? normalizeDocument(body.documentNumber)
        : client.documentNumber
      const taken = clients.some(
        (c) =>
          c.id !== client.id &&
          c.documentType === documentType &&
          c.documentNumber === documentNumber,
      )
      if (taken) {
        return errorResponse(
          409,
          `Customer with ${documentType} "${documentNumber}" already exists. ` +
            'If that customer is inactive, reactivate it instead of creating a new one',
          path,
        )
      }

      Object.assign(client, {
        ...body,
        documentType,
        documentNumber,
      })
      return HttpResponse.json(client)
    },
  ),
]
