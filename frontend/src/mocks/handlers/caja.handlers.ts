import { delay, http, HttpResponse } from 'msw'
import type { Cliente, RegistrarClienteDTO } from '@/features/caja'
import { API_URL } from '@/shared/api/http'

// Mismos clientes que backend/prisma/seed.ts, para probar el documento duplicado.
const clientes: Cliente[] = [
  {
    id: 1,
    nombre: 'Lucía',
    apellido: 'Fernández',
    tipoDocumento: 'DNI',
    numeroDocumento: '40123456',
    telefono: '3511111111',
    email: 'lucia@example.com',
    fechaNacimiento: '1998-05-14T00:00:00.000Z',
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
    activo: true,
    creadoEn: new Date().toISOString(),
  },
]

export const cajaHandlers = [
  // RF-015: respuestas con el mismo formato que NestJS (201 / 400 / 409).
  http.post<never, RegistrarClienteDTO>(
    `${API_URL}/clientes`,
    async ({ request }) => {
      await delay(400)
      const body = await request.json()

      const faltantes = (
        ['nombre', 'apellido', 'tipoDocumento', 'numeroDocumento', 'email'] as const
      ).filter((campo) => !body[campo])
      if (faltantes.length) {
        return HttpResponse.json(
          {
            message: faltantes.map((c) => `${c} should not be empty`),
            error: 'Bad Request',
            statusCode: 400,
          },
          { status: 400 },
        )
      }

      const existe = clientes.some(
        (c) =>
          c.tipoDocumento === body.tipoDocumento &&
          c.numeroDocumento === body.numeroDocumento,
      )
      if (existe) {
        return HttpResponse.json(
          {
            message: `Ya existe un cliente con ${body.tipoDocumento} ${body.numeroDocumento}`,
            error: 'Conflict',
            statusCode: 409,
          },
          { status: 409 },
        )
      }

      const nuevo: Cliente = {
        id: clientes.length + 1,
        ...body,
        telefono: body.telefono ?? null,
        fechaNacimiento: null,
        activo: true,
        creadoEn: new Date().toISOString(),
      }
      clientes.push(nuevo)
      return HttpResponse.json(nuevo, { status: 201 })
    },
  ),
]
