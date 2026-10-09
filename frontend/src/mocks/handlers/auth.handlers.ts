// Handlers de MSW para el login: mismas rutas, códigos y formato de error que
// la API de NestJS (docs/auth-api.md en origin/feature/auth-login).
// Mismas cuentas que el seed de Prisma, con una contraseña de prueba común.
import { delay, http, HttpResponse } from 'msw'
import type { AuthResponse, AuthUser, RegisterCustomerBody } from '@/features/auth'
import type { Customer } from '@/features/cashier'
import { API_URL } from '@/shared/api/http'
import { customers, errorResponse as customerErrorResponse } from './cashier.handlers'

const PASSWORD = 'vitto2026'

const accounts: AuthUser[] = [
  { accountId: 1, role: 'ADMIN', email: 'ana.gomez@vitto.club', employeeId: 1, firstName: 'Ana', lastName: 'Gómez' },
  { accountId: 2, role: 'CASHIER', email: 'bruno.perez@vitto.club', employeeId: 2, firstName: 'Bruno', lastName: 'Pérez' },
  { accountId: 3, role: 'CUSTOMER', email: 'lucia@example.com', customerId: 1, firstName: 'Lucía', lastName: 'Fernández' },
  { accountId: 4, role: 'CASHIER', email: 'diego.sosa@vitto.club', employeeId: 4, firstName: 'Diego', lastName: 'Sosa' },
]

// Cuentas dadas de baja: responden igual que un mail inexistente
const inactiveAccountIds = new Set([4])

// Hace de la cookie httpOnly del refresh: sobrevive a recargar la página
const SESSION_KEY = 'vitto:mock-session'

const STATUS_NAMES = { 400: 'Bad Request', 401: 'Unauthorized' }

const errorResponse = (
  statusCode: 400 | 401,
  message: string | string[],
  request: Request,
  code?: string,
) =>
  HttpResponse.json(
    {
      statusCode,
      error: STATUS_NAMES[statusCode],
      message,
      path: new URL(request.url).pathname,
      timestamp: new Date().toISOString(),
      ...(code ? { code } : {}),
    },
    { status: statusCode },
  )

const authResponse = (user: AuthUser): AuthResponse => ({
  accessToken: `mock-access-token-${user.accountId}-${Date.now()}`,
  user,
})

// Equivalente al ValidationPipe (whitelist + forbidNonWhitelisted) con LoginDto
function validateLogin(body: Record<string, unknown>): string[] {
  const messages = Object.keys(body)
    .filter((key) => key !== 'email' && key !== 'password')
    .map((key) => `property ${key} should not exist`)
  const rules = [
    ['email', 150],
    ['password', 64],
  ] as const
  for (const [field, max] of rules) {
    const value = body[field]
    if (typeof value !== 'string' || value === '') {
      messages.push(`${field} should not be empty`)
    } else if (value.length > max) {
      messages.push(`${field} must be shorter than or equal to ${max} characters`)
    }
  }
  return messages
}

export const authHandlers = [
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    await delay(400)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const messages = validateLogin(body)
    if (messages.length > 0) return errorResponse(400, messages, request)

    const email = String(body.email).trim().toLowerCase()
    const account = accounts.find((item) => item.email === email)
    // Mismo mensaje para cualquier causa, a propósito
    if (!account || inactiveAccountIds.has(account.accountId) || body.password !== PASSWORD) {
      return errorResponse(401, 'Los datos de acceso son incorrectos', request, 'INVALID_CREDENTIALS')
    }

    sessionStorage.setItem(SESSION_KEY, String(account.accountId))
    return HttpResponse.json(authResponse(account))
  }),

  http.post(`${API_URL}/auth/refresh`, async ({ request }) => {
    await delay(200)
    const accountId = Number(sessionStorage.getItem(SESSION_KEY))
    const account = accounts.find((item) => item.accountId === accountId)
    if (!account || inactiveAccountIds.has(account.accountId)) {
      return errorResponse(401, 'La sesión no es válida', request, 'INVALID_SESSION')
    }
    return HttpResponse.json(authResponse(account))
  }),

  http.post(`${API_URL}/auth/logout`, () => {
    sessionStorage.removeItem(SESSION_KEY)
    return new HttpResponse(null, { status: 204 })
  }),

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
        return customerErrorResponse(
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
        return customerErrorResponse(
          409,
          `Customer with ${data.documentType} "${data.documentNumber}" already exists. ` +
            'If that customer is inactive, reactivate it instead of creating a new one',
          path,
        )
      }
      const email = data.email.toLowerCase()
      if (customers.some((customer) => customer.email.toLowerCase() === email)) {
        return customerErrorResponse(
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
