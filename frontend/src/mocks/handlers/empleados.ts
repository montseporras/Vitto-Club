// Handlers de MSW para empleados: mismas rutas que expondrá la API de NestJS.
// Estado en memoria, sembrado igual que el seed de Prisma del backend.
import { http, HttpResponse } from 'msw';
import { API_URL } from '@/shared/api/http';
import type {
  ActualizarEmpleadoDto,
  CrearEmpleadoDto,
  Empleado,
} from '@/features/empleados';

const empleados: Empleado[] = [
  { id: 1, firstName: 'Ana', lastName: 'Gómez', phone: '3510000001', email: 'ana.gomez@vitto.club', role: 'ADMIN', isActive: true },
  { id: 2, firstName: 'Bruno', lastName: 'Pérez', phone: '3510000002', email: 'bruno.perez@vitto.club', role: 'CASHIER', isActive: true },
  { id: 3, firstName: 'Carla', lastName: 'Martínez', phone: '3510000003', email: 'carla.martinez@vitto.club', role: 'CASHIER', isActive: true },
];

let nextId = empleados.length + 1;

export const empleadosHandlers = [
  // Mismo orden que el backend: apellido, nombre e id.
  http.get(`${API_URL}/empleados`, () =>
    HttpResponse.json(
      [...empleados].sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName, 'es') ||
          a.firstName.localeCompare(b.firstName, 'es') ||
          a.id - b.id,
      ),
    ),
  ),

  http.post(`${API_URL}/empleados`, async ({ request }) => {
    const body = (await request.json()) as CrearEmpleadoDto;
    // Igual que el backend: el mail no se puede repetir (409).
    if (empleados.some((e) => e.email.toLowerCase() === body.email.toLowerCase())) {
      return HttpResponse.json(
        { message: `Employee with email "${body.email}" already exists` },
        { status: 409 },
      );
    }
    const nuevo: Empleado = {
      id: nextId++,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone ?? null,
      email: body.email,
      role: body.role,
      isActive: true,
    };
    empleados.push(nuevo);
    return HttpResponse.json(nuevo, { status: 201 });
  }),

  http.patch(`${API_URL}/empleados/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const empleado = empleados.find((e) => e.id === id);
    if (!empleado) {
      return HttpResponse.json(
        { message: 'Empleado no encontrado' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as ActualizarEmpleadoDto;
    empleado.firstName = body.firstName;
    empleado.lastName = body.lastName;
    empleado.phone = body.phone ?? null;
    empleado.role = body.role;
    return HttpResponse.json(empleado, { status: 200 });
  }),

  http.delete(`${API_URL}/empleados/:id`, ({ params }) => {
    const id = Number(params.id);
    const empleado = empleados.find((e) => e.id === id);
    if (!empleado) {
      return HttpResponse.json(
        { message: 'Empleado no encontrado' },
        { status: 404 },
      );
    }
    empleado.isActive = false;
    return HttpResponse.json(empleado, { status: 200 });
  }),
];
