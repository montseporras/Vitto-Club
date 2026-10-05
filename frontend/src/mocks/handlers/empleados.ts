// Handlers de MSW para empleados: mismas rutas, validaciones y códigos de
// respuesta que la API de NestJS (ver docs/employees-api.md).
// Estado en memoria, sembrado igual que el seed de Prisma del backend.
import { http, HttpResponse } from 'msw';
import { API_URL } from '@/shared/api/http';
import type { Empleado } from '@/features/empleados';

const empleados: Empleado[] = [
  { id: 1, firstName: 'Ana', lastName: 'Gómez', phone: '3510000001', email: 'ana.gomez@vitto.club', role: 'ADMIN', isActive: true },
  { id: 2, firstName: 'Bruno', lastName: 'Pérez', phone: '3510000002', email: 'bruno.perez@vitto.club', role: 'CASHIER', isActive: true },
  { id: 3, firstName: 'Carla', lastName: 'Martínez', phone: '3510000003', email: 'carla.martinez@vitto.club', role: 'CASHIER', isActive: true },
  // Dado de baja (no está en el seed): sirve para probar que no se puede editar (409)
  { id: 4, firstName: 'Diego', lastName: 'Sosa', phone: null, email: 'diego.sosa@vitto.club', role: 'CASHIER', isActive: false },
];

let nextId = empleados.length + 1;

const STATUS_NAMES = { 400: 'Bad Request', 404: 'Not Found', 409: 'Conflict' };

type Detalle = { field: string; message: string };

// Mismo formato que EmployeesExceptionFilter del backend.
const errorResponse = (
  statusCode: 400 | 404 | 409,
  message: string | string[],
  request: Request,
  details?: Detalle[],
) => {
  const { pathname, search } = new URL(request.url);
  return HttpResponse.json(
    {
      statusCode,
      error: STATUS_NAMES[statusCode],
      message,
      path: pathname + search,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    },
    { status: statusCode },
  );
};

// Error de regla de dominio (Employee / Mail del backend): 400 con `details`.
const domainError = (field: string, message: string, request: Request) =>
  errorResponse(400, message, request, [{ field, message }]);

const ROLES = ['ADMIN', 'CASHIER'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;
const PHONE_ERROR =
  'Employee phone is invalid: use digits, spaces, "+", "-", "(" and ")", with 8 to 15 digits';

const esTextoNoVacio = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

// Equivalente al ValidationPipe global (whitelist + forbidNonWhitelisted) más
// los decoradores de CreateEmployeeDto / UpdateEmployeeDto. Devuelve la lista
// de mensajes; vacía si el body es válido.
function validarBody(body: Record<string, unknown>, conEmail: boolean): string[] {
  const permitidos = ['firstName', 'lastName', 'role', 'phone'];
  if (conEmail) permitidos.push('email');

  const errores = Object.keys(body)
    .filter((key) => !permitidos.includes(key))
    .map((key) => `property ${key} should not exist`);

  for (const field of ['firstName', 'lastName'] as const) {
    const value = body[field];
    if (!esTextoNoVacio(value)) errores.push(`${field} should not be empty`);
    else if (value.length > 80) {
      errores.push(`${field} must be shorter than or equal to 80 characters`);
    }
  }

  if (conEmail) {
    const { email } = body;
    if (!esTextoNoVacio(email)) errores.push('email should not be empty');
    else if (!EMAIL_PATTERN.test(email)) errores.push('email must be an email');
    else if (email.length > 150) {
      errores.push('email must be shorter than or equal to 150 characters');
    }
  }

  if (!ROLES.includes(body.role as string)) {
    errores.push('role must be one of the following values: ADMIN, CASHIER');
  }

  const { phone } = body;
  if (phone !== undefined && phone !== null) {
    if (typeof phone !== 'string') errores.push('phone must be a string');
    else if (phone.length > 30) {
      errores.push('phone must be shorter than or equal to 30 characters');
    }
  }

  return errores;
}

// Igual que optionalPhone del dominio: vacío o ausente = sin teléfono (null).
// Devuelve `false` si el formato es inválido.
function normalizarTelefono(value: unknown): string | null | false {
  const phone = typeof value === 'string' ? value.trim() : '';
  if (!phone) return null;
  const digitos = phone.replace(/\D/g, '').length;
  if (!PHONE_PATTERN.test(phone) || digitos < 8 || digitos > 15) return false;
  return phone;
}

// GET/PATCH/DELETE /:id — ParseIntPipe: 400 si el id no es numérico.
function buscarPorId(idParam: unknown, request: Request) {
  if (typeof idParam !== 'string' || !/^-?\d+$/.test(idParam)) {
    return {
      error: errorResponse(
        400,
        'Validation failed (numeric string is expected)',
        request,
      ),
    };
  }
  const id = Number(idParam);
  const empleado = empleados.find((e) => e.id === id);
  if (!empleado) {
    return {
      error: errorResponse(404, `Employee with ID ${id} not found`, request),
    };
  }
  return { empleado };
}

export const empleadosHandlers = [
  // US-03: GET /api/empleados?name=ana&active=true -> siempre un array.
  http.get(`${API_URL}/empleados`, ({ request }) => {
    const params = new URL(request.url).searchParams;

    const errores = [...new Set(params.keys())]
      .filter((key) => key !== 'name' && key !== 'active')
      .map((key) => `property ${key} should not exist`);
    const active = params.get('active');
    if (active !== null && active !== 'true' && active !== 'false') {
      errores.push('active must be one of the following values: true, false');
    }
    const name = params.get('name') ?? '';
    if (name.length > 80) {
      errores.push('name must be shorter than or equal to 80 characters');
    }
    if (errores.length) return errorResponse(400, errores, request);

    // Cada palabra debe aparecer en el nombre o en el apellido, sin distinguir
    // mayúsculas. Como en el backend, no se ignoran los acentos.
    const terminos = name.toLowerCase().split(/\s+/).filter(Boolean);
    const resultado = empleados
      .filter(
        (e) =>
          (active === null || e.isActive === (active === 'true')) &&
          terminos.every(
            (termino) =>
              e.firstName.toLowerCase().includes(termino) ||
              e.lastName.toLowerCase().includes(termino),
          ),
      )
      // Mismo orden que el backend: apellido, nombre e id.
      .sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName, 'es') ||
          a.firstName.localeCompare(b.firstName, 'es') ||
          a.id - b.id,
      );
    return HttpResponse.json(resultado);
  }),

  // US-03: GET /api/empleados/:id
  http.get(`${API_URL}/empleados/:id`, ({ params, request }) => {
    const { empleado, error } = buscarPorId(params.id, request);
    return error ?? HttpResponse.json(empleado);
  }),

  // US-01: POST /api/empleados responde 201 / 400 / 409.
  http.post(`${API_URL}/empleados`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    const errores = validarBody(body, true);
    if (errores.length) return errorResponse(400, errores, request);

    const firstName = (body.firstName as string).trim();
    const lastName = (body.lastName as string).trim();
    if (!firstName) {
      return domainError('firstName', 'Employee firstName cannot be empty', request);
    }
    if (!lastName) {
      return domainError('lastName', 'Employee lastName cannot be empty', request);
    }
    const phone = normalizarTelefono(body.phone);
    if (phone === false) return domainError('phone', PHONE_ERROR, request);

    // El mail se guarda en minúsculas y no se puede repetir, aunque el otro
    // empleado esté dado de baja.
    const email = (body.email as string).trim().toLowerCase();
    if (empleados.some((e) => e.email.toLowerCase() === email)) {
      return errorResponse(
        409,
        `Employee with email "${email}" already exists`,
        request,
      );
    }

    const nuevo: Empleado = {
      id: nextId++,
      firstName,
      lastName,
      phone,
      email,
      role: body.role as Empleado['role'],
      isActive: true,
    };
    empleados.push(nuevo);
    return HttpResponse.json(nuevo, { status: 201 });
  }),

  // US-02: PATCH /api/empleados/:id responde 200 / 400 / 404 / 409.
  // El mail no se edita: si viene en el body, responde 400.
  http.patch(`${API_URL}/empleados/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    const encontrado = buscarPorId(params.id, request);
    const errores = validarBody(body, false);
    if (errores.length) return errorResponse(400, errores, request);
    if (encontrado.error) return encontrado.error;
    const { empleado } = encontrado;

    if (!empleado.isActive) {
      return errorResponse(
        409,
        `Employee with ID ${empleado.id} is inactive and cannot be modified`,
        request,
      );
    }

    // Se valida todo antes de asignar: un dato inválido no guarda nada.
    const firstName = (body.firstName as string).trim();
    const lastName = (body.lastName as string).trim();
    if (!firstName) {
      return domainError('firstName', 'Employee firstName cannot be empty', request);
    }
    if (!lastName) {
      return domainError('lastName', 'Employee lastName cannot be empty', request);
    }
    const phone = normalizarTelefono(body.phone);
    if (phone === false) return domainError('phone', PHONE_ERROR, request);

    empleado.firstName = firstName;
    empleado.lastName = lastName;
    empleado.phone = phone;
    empleado.role = body.role as Empleado['role'];
    return HttpResponse.json(empleado);
  }),

  // US-04: DELETE /api/empleados/:id -> baja lógica, responde 200 / 400 / 404 / 409.
  http.delete(`${API_URL}/empleados/:id`, ({ params, request }) => {
    const { empleado, error } = buscarPorId(params.id, request);
    if (error) return error;

    if (!empleado.isActive) {
      return errorResponse(
        409,
        `Employee with ID ${empleado.id} is already inactive`,
        request,
      );
    }
    empleado.isActive = false;
    return HttpResponse.json(empleado);
  }),
];
