import { delay, http, HttpResponse } from 'msw'
import type { Client, CreateClientBody } from '@/features/caja'
import { API_URL } from '@/shared/api/http'

// Mismos clientes que backend/prisma/seed.ts, para probar el documento duplicado.
const clients: Client[] = [
  {
    id: 1,
    nombre: 'Lucía',
    apellido: 'Fernández',
    tipoDocumento: 'DNI',
    numeroDocumento: '40123456',
    telefono: '3511111111',
    email: 'lucia@example.com',
    fechaNacimiento: '1998-05-14T00:00:00.000Z',
    fotoUrl: null,
    activo: true,
    creadoEn: new Date().toISOString(),
  },
  {
    id: 2,
    nombre: 'Martín',
    apellido: 'Suárez',
    tipoDocumento: 'DNI',
    numeroDocumento: '38987654',
    telefono: '3512222222',
    email: 'martin@example.com',
    fechaNacimiento: null,
    fotoUrl: null,
    activo: true,
    creadoEn: new Date().toISOString(),
  },
]

export const cajaHandlers = [
  // RF-015: respuestas con el mismo formato que NestJS (201 / 400 / 409).
  http.post<never, CreateClientBody>(
    `${API_URL}/clientes`,
    async ({ request }) => {
      await delay(400)
      const body = await request.json()

      const missing = (
        ['nombre', 'apellido', 'tipoDocumento', 'numeroDocumento', 'email'] as const
      ).filter((field) => !body[field])
      if (missing.length) {
        return HttpResponse.json(
          {
            message: missing.map((field) => `${field} should not be empty`),
            error: 'Bad Request',
            statusCode: 400,
          },
          { status: 400 },
        )
      }

      const exists = clients.some(
        (client) =>
          client.tipoDocumento === body.tipoDocumento &&
          client.numeroDocumento === body.numeroDocumento,
      )
      if (exists) {
        return HttpResponse.json(
          {
            message: `Ya existe un cliente con ${body.tipoDocumento} ${body.numeroDocumento}`,
            error: 'Conflict',
            statusCode: 409,
          },
          { status: 409 },
        )
      }

      const { foto, ...data } = body
      const created: Client = {
        id: clients.length + 1,
        ...data,
        telefono: data.telefono ?? null,
        fechaNacimiento: data.fechaNacimiento
          ? new Date(data.fechaNacimiento).toISOString()
          : null,
        // Provisorio: el backend real va a devolver la URL del archivo guardado
        fotoUrl: foto ?? null,
        activo: true,
        creadoEn: new Date().toISOString(),
      }
      clients.push(created)
      return HttpResponse.json(created, { status: 201 })
    },
  ),
]
