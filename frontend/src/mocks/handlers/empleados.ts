// Handlers de MSW para empleados: mismas rutas que expondrá la API de NestJS.
// Estado en memoria, sembrado igual que el seed de Prisma del backend.
import { http, HttpResponse } from 'msw';
import type { CrearEmpleadoDto, Empleado } from '@/features/empleados/types/empleado';

const empleados: Empleado[] = [
  { id: 1, firstName: 'Ana', lastName: 'Gómez', phone: '3510000001', email: 'ana.gomez@vitto.club', role: 'ADMIN', isActive: true },
  { id: 2, firstName: 'Bruno', lastName: 'Pérez', phone: '3510000002', email: 'bruno.perez@vitto.club', role: 'CASHIER', isActive: true },
  { id: 3, firstName: 'Carla', lastName: 'Martínez', phone: '3510000003', email: 'carla.martinez@vitto.club', role: 'CASHIER', isActive: true },
];

let nextId = empleados.length + 1;

export const empleadosHandlers = [
  http.get('/api/empleados', () => HttpResponse.json(empleados)),

  http.post('/api/empleados', async ({ request }) => {
    const body = (await request.json()) as CrearEmpleadoDto;
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
];
