// Handlers de MSW para empleados: mismas rutas, validaciones y códigos de
// respuesta que la API de NestJS (ver docs/employees-api.md).
// Estado en memoria, sembrado igual que el seed de Prisma del backend.
import { http, HttpResponse } from 'msw';
import { API_URL } from '@/shared/api/http';
import type { Account, Employee } from '@/features/employees';

const employees: Employee[] = [
  { id: 1, firstName: 'Ana', lastName: 'Gómez', phone: '3510000001', email: 'ana.gomez@vitto.club', role: 'ADMIN', isActive: true, hasAccount: true },
  { id: 2, firstName: 'Bruno', lastName: 'Pérez', phone: '3510000002', email: 'bruno.perez@vitto.club', role: 'CASHIER', isActive: true, hasAccount: false },
  { id: 3, firstName: 'Carla', lastName: 'Martínez', phone: '3510000003', email: 'carla.martinez@vitto.club', role: 'CASHIER', isActive: true, hasAccount: false },
  // Dado de baja (no está en el seed): sirve para probar que no se puede editar (409)
  { id: 4, firstName: 'Diego', lastName: 'Sosa', phone: null, email: 'diego.sosa@vitto.club', role: 'CASHIER', isActive: false, hasAccount: false },
];

let nextId = employees.length + 1;

// Usuarios del sistema (tabla accounts). Ana es la administradora del seed.
const accounts: Account[] = [
  { accountId: 1, employeeId: 1, email: 'ana.gomez@vitto.club', role: 'ADMIN', active: true },
];

let nextAccountId = accounts.length + 1;

const STATUS_NAMES = { 400: 'Bad Request', 404: 'Not Found', 409: 'Conflict' };

type Detail = { field: string; message: string };

// Mismo formato que EmployeesExceptionFilter del backend.
const errorResponse = (
  statusCode: 400 | 404 | 409,
  message: string | string[],
  request: Request,
  details?: Detail[],
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

const isNonEmptyText = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

// Equivalente al ValidationPipe global (whitelist + forbidNonWhitelisted) más
// los decoradores de CreateEmployeeDto / UpdateEmployeeDto. Devuelve la lista
// de mensajes; vacía si el body es válido.
function validateBody(body: Record<string, unknown>, withEmail: boolean): string[] {
  const allowed = ['firstName', 'lastName', 'role', 'phone'];
  if (withEmail) allowed.push('email');

  const errors = Object.keys(body)
    .filter((key) => !allowed.includes(key))
    .map((key) => `property ${key} should not exist`);

  for (const field of ['firstName', 'lastName'] as const) {
    const value = body[field];
    if (!isNonEmptyText(value)) errors.push(`${field} should not be empty`);
    else if (value.length > 80) {
      errors.push(`${field} must be shorter than or equal to 80 characters`);
    }
  }

  if (withEmail) {
    const { email } = body;
    if (!isNonEmptyText(email)) errors.push('email should not be empty');
    else if (!EMAIL_PATTERN.test(email)) errors.push('email must be an email');
    else if (email.length > 150) {
      errors.push('email must be shorter than or equal to 150 characters');
    }
  }

  if (!ROLES.includes(body.role as string)) {
    errors.push('role must be one of the following values: ADMIN, CASHIER');
  }

  const { phone } = body;
  if (phone !== undefined && phone !== null) {
    if (typeof phone !== 'string') errors.push('phone must be a string');
    else if (phone.length > 30) {
      errors.push('phone must be shorter than or equal to 30 characters');
    }
  }

  return errors;
}

// Igual que optionalPhone del dominio: vacío o ausente = sin teléfono (null).
// Devuelve `false` si el formato es inválido.
function normalizePhone(value: unknown): string | null | false {
  const phone = typeof value === 'string' ? value.trim() : '';
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '').length;
  if (!PHONE_PATTERN.test(phone) || digits < 8 || digits > 15) return false;
  return phone;
}

// GET/PATCH/DELETE /:id — ParseIntPipe: 400 si el id no es numérico.
function findById(idParam: unknown, request: Request) {
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
  const employee = employees.find((e) => e.id === id);
  if (!employee) {
    return {
      error: errorResponse(404, `Employee with ID ${id} not found`, request),
    };
  }
  return { employee };
}

export const employeesHandlers = [
  // US-03: GET /api/empleados?name=ana&active=true -> siempre un array.
  http.get(`${API_URL}/empleados`, ({ request }) => {
    const params = new URL(request.url).searchParams;

    const errors = [...new Set(params.keys())]
      .filter((key) => key !== 'name' && key !== 'active')
      .map((key) => `property ${key} should not exist`);
    const active = params.get('active');
    if (active !== null && active !== 'true' && active !== 'false') {
      errors.push('active must be one of the following values: true, false');
    }
    const name = params.get('name') ?? '';
    if (name.length > 80) {
      errors.push('name must be shorter than or equal to 80 characters');
    }
    if (errors.length) return errorResponse(400, errors, request);

    // Cada palabra debe aparecer en el nombre o en el apellido, sin distinguir
    // mayúsculas. Como en el backend, no se ignoran los acentos.
    const terms = name.toLowerCase().split(/\s+/).filter(Boolean);
    const result = employees
      .filter(
        (e) =>
          (active === null || e.isActive === (active === 'true')) &&
          terms.every(
            (term) =>
              e.firstName.toLowerCase().includes(term) ||
              e.lastName.toLowerCase().includes(term),
          ),
      )
      // Mismo orden que el backend: apellido, nombre e id.
      .sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName, 'es') ||
          a.firstName.localeCompare(b.firstName, 'es') ||
          a.id - b.id,
      );
    return HttpResponse.json(result);
  }),

  // US-03: GET /api/empleados/:id
  http.get(`${API_URL}/empleados/:id`, ({ params, request }) => {
    const { employee, error } = findById(params.id, request);
    return error ?? HttpResponse.json(employee);
  }),

  // US-01: POST /api/empleados responde 201 / 400 / 409.
  http.post(`${API_URL}/empleados`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    const errors = validateBody(body, true);
    if (errors.length) return errorResponse(400, errors, request);

    const firstName = (body.firstName as string).trim();
    const lastName = (body.lastName as string).trim();
    if (!firstName) {
      return domainError('firstName', 'Employee firstName cannot be empty', request);
    }
    if (!lastName) {
      return domainError('lastName', 'Employee lastName cannot be empty', request);
    }
    const phone = normalizePhone(body.phone);
    if (phone === false) return domainError('phone', PHONE_ERROR, request);

    // El mail se guarda en minúsculas y no se puede repetir, aunque el otro
    // empleado esté dado de baja.
    const email = (body.email as string).trim().toLowerCase();
    if (employees.some((e) => e.email.toLowerCase() === email)) {
      return errorResponse(
        409,
        `Employee with email "${email}" already exists`,
        request,
      );
    }

    const created: Employee = {
      id: nextId++,
      firstName,
      lastName,
      phone,
      email,
      role: body.role as Employee['role'],
      isActive: true,
      hasAccount: false,
    };
    employees.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  // US-02: PATCH /api/empleados/:id responde 200 / 400 / 404 / 409.
  // El mail no se edita: si viene en el body, responde 400.
  http.patch(`${API_URL}/empleados/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    const found = findById(params.id, request);
    const errors = validateBody(body, false);
    if (errors.length) return errorResponse(400, errors, request);
    if (found.error) return found.error;
    const { employee } = found;

    if (!employee.isActive) {
      return errorResponse(
        409,
        `Employee with ID ${employee.id} is inactive and cannot be modified`,
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
    const phone = normalizePhone(body.phone);
    if (phone === false) return domainError('phone', PHONE_ERROR, request);

    employee.firstName = firstName;
    employee.lastName = lastName;
    employee.phone = phone;
    employee.role = body.role as Employee['role'];
    return HttpResponse.json(employee);
  }),

  // US-04: DELETE /api/empleados/:id -> baja lógica, responde 200 / 400 / 404 / 409.
  http.delete(`${API_URL}/empleados/:id`, ({ params, request }) => {
    const { employee, error } = findById(params.id, request);
    if (error) return error;

    if (!employee.isActive) {
      return errorResponse(
        409,
        `Employee with ID ${employee.id} is already inactive`,
        request,
      );
    }
    employee.isActive = false;
    return HttpResponse.json(employee);
  }),

  // SCRUM-21: POST /api/usuarios responde 201 / 400 / 404 / 409, en el mismo
  // orden de validaciones que AccountsService.register del backend.
  // No se valida el mail contra los clientes (en el backend es un 409).
  http.post(`${API_URL}/usuarios`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    const errors = Object.keys(body)
      .filter((key) => !['employeeId', 'email', 'password'].includes(key))
      .map((key) => `property ${key} should not exist`);
    const { employeeId, email, password } = body;
    if (!Number.isInteger(employeeId) || (employeeId as number) <= 0) {
      errors.push('employeeId must be a positive number');
    }
    if (!isNonEmptyText(email)) errors.push('email should not be empty');
    else if (!EMAIL_PATTERN.test(email)) errors.push('email must be an email');
    else if (email.length > 150) {
      errors.push('email must be shorter than or equal to 150 characters');
    }
    if (typeof password !== 'string' || password.length < 8) {
      errors.push('password must be longer than or equal to 8 characters');
    } else if (password.length > 64) {
      errors.push('password must be shorter than or equal to 64 characters');
    }
    if (errors.length) return errorResponse(400, errors, request);

    const { employee, error } = findById(String(employeeId), request);
    if (error) return error;

    if (!employee.isActive) {
      return errorResponse(
        409,
        `Employee with ID ${employee.id} is inactive and cannot have an account`,
        request,
      );
    }
    if (accounts.some((a) => a.employeeId === employee.id)) {
      return errorResponse(
        409,
        `Employee with ID ${employee.id} already has an account`,
        request,
      );
    }
    if ((email as string).trim().toLowerCase() !== employee.email) {
      return errorResponse(
        400,
        "The email must match the associated employee's email",
        request,
      );
    }
    if (password === employee.email) {
      return domainError('password', 'Password cannot be equal to the email', request);
    }

    const account: Account = {
      accountId: nextAccountId++,
      employeeId: employee.id,
      email: employee.email,
      role: employee.role,
      active: true,
    };
    accounts.push(account);
    employee.hasAccount = true;
    return HttpResponse.json(account, { status: 201 });
  }),
];
