// Handlers de MSW para Mi perfil del Cliente (PERFIL): mismas rutas, códigos y
// formato de error que el backend (contrato §3.10 y §3.11, y la §8 de
// CAMBIOS_PROPUESTOS_AL_CONTRATO_PERFIL.md en la rama backend-maga).
import { delay, http, HttpResponse } from 'msw'
import type { MyPoints, MyProfile } from '@/features/my-account'
import { API_URL } from '@/shared/api/http'
import { accounts, passwordOf, setPassword } from './auth.handlers'
import { customers } from './cashier.handlers'

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  409: 'Conflict',
  429: 'Too Many Requests',
}

const errorResponse = (
  statusCode: 400 | 401 | 403 | 409 | 429,
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

// Saldo y nivel de cada cliente (lo calcula el backend; acá son datos fijos)
const points: Record<number, MyPoints> = {
  1: {
    customerId: 1,
    balance: 350,
    negativeBalance: false,
    lifetimePoints: 450,
    level: { current: 'SILVER', next: 'GOLD', currentMinPoints: 300, nextMinPoints: 800, pointsToNext: 350, progressPercent: 30 },
    nextExpirations: [{ points: 200, expiresAt: '2026-11-30' }],
  },
  // Martín: una anulación lo dejó con deuda, para ver el aviso de saldo negativo
  2: {
    customerId: 2,
    balance: -120,
    negativeBalance: true,
    lifetimePoints: 80,
    level: { current: 'BRONZE', next: 'SILVER', currentMinPoints: 0, nextMinPoints: 300, pointsToNext: 220, progressPercent: 27 },
    nextExpirations: [],
  },
}

const emptyPoints = (customerId: number): MyPoints => ({
  customerId,
  balance: 0,
  negativeBalance: false,
  lifetimePoints: 0,
  level: { current: 'BRONZE', next: 'SILVER', currentMinPoints: 0, nextMinPoints: 300, pointsToNext: 300, progressPercent: 0 },
  nextExpirations: [],
})

// Límite de intentos: más de 5 contraseñas actuales incorrectas en 15 minutos.
// El contador es uno solo para el cambio de correo y el de contraseña.
const MAX_FAILED_ATTEMPTS = 5
const ATTEMPTS_WINDOW_MS = 15 * 60 * 1000
const failedAttempts = new Map<number, number[]>()

const recentFailures = (accountId: number) =>
  (failedAttempts.get(accountId) ?? []).filter((at) => Date.now() - at < ATTEMPTS_WINDOW_MS)

function recordFailure(accountId: number) {
  failedAttempts.set(accountId, [...recentFailures(accountId), Date.now()])
}

const TOO_MANY_ATTEMPTS = 'Hiciste demasiados intentos. Probá de nuevo en unos minutos.'
const CURRENT_PASSWORD_INCORRECT = 'La contraseña actual es incorrecta'

// Quién llama: el access token del mock es `mock-access-token-{accountId}-{fecha}`
function callerOf(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const accountId = Number(/^mock-access-token-(\d+)-/.exec(token)?.[1])
  return accounts.find((account) => account.accountId === accountId)
}

/** Sesión de un Cliente, o la respuesta de error (401 sin sesión, 403 otro rol). */
function requireCustomer(request: Request) {
  const account = callerOf(request)
  if (!account) {
    return { error: errorResponse(401, 'Unauthorized', request, 'UNAUTHENTICATED') }
  }
  const customer = customers.find((item) => item.id === account.customerId)
  if (account.role !== 'CUSTOMER' || !customer) {
    return {
      error: errorResponse(403, 'You do not have permission to perform this operation', request, 'FORBIDDEN'),
    }
  }
  return { account, customer }
}

// Sin `active` ni `deactivatedAt` (§3.10.3)
const toProfile = (customer: (typeof customers)[number]): MyProfile => ({
  id: customer.id,
  firstName: customer.firstName,
  lastName: customer.lastName,
  documentType: customer.documentType,
  documentNumber: customer.documentNumber,
  email: customer.email,
  phone: customer.phone,
  dateOfBirth: customer.dateOfBirth,
  createdAt: customer.createdAt,
})

const isValidPhone = (value: string) => {
  if (value.length > 30 || !/^\+?[\d\s().-]+$/.test(value)) return false
  const digits = value.replace(/\D/g, '').length
  return digits >= 8 && digits <= 15
}

function birthDateError(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return 'Esa fecha no existe'
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'Esa fecha no existe'
  if (Number(match[1]) < 1900) return 'Esa fecha no existe'
  if (value > new Date().toISOString().slice(0, 10)) return 'La fecha no puede ser futura'
  return null
}

const normalizeDocument = (value: string) => value.replace(/[\s.-]/g, '').toUpperCase()

const PROFILE_FIELDS = ['phone', 'email', 'currentPassword', 'dateOfBirth']
const PASSWORD_FIELDS = ['currentPassword', 'newPassword']

const extraFields = (body: Record<string, unknown>, allowed: string[]) =>
  Object.keys(body)
    .filter((key) => !allowed.includes(key))
    .map((key) => `property ${key} should not exist`)

export const myAccountHandlers = [
  http.get(`${API_URL}/customers/me`, async ({ request }) => {
    await delay(300)
    const caller = requireCustomer(request)
    if ('error' in caller) return caller.error
    return HttpResponse.json(toProfile(caller.customer))
  }),

  http.get(`${API_URL}/customers/me/puntos`, async ({ request }) => {
    await delay(300)
    const caller = requireCustomer(request)
    if ('error' in caller) return caller.error
    return HttpResponse.json(points[caller.customer.id] ?? emptyPoints(caller.customer.id))
  }),

  // §3.10.4: solo lo que cambia; con un error no se guarda nada
  http.patch(`${API_URL}/customers/me`, async ({ request }) => {
    await delay(400)
    const caller = requireCustomer(request)
    if ('error' in caller) return caller.error
    const { account, customer } = caller

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const extra = extraFields(body, PROFILE_FIELDS)
    if (extra.length > 0) return errorResponse(400, extra, request)
    if (!('phone' in body) && !('email' in body) && !('dateOfBirth' in body)) {
      return errorResponse(400, 'At least one field must be provided', request)
    }

    const changes: Partial<MyProfile> = {}
    if ('phone' in body) {
      const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
      if (phone && !isValidPhone(phone)) {
        return errorResponse(400, 'El teléfono tiene que tener entre 8 y 15 números', request)
      }
      changes.phone = phone || null
    }
    if ('dateOfBirth' in body) {
      if (body.dateOfBirth !== null) {
        const error = birthDateError(String(body.dateOfBirth))
        if (error) return errorResponse(400, error, request)
      }
      changes.dateOfBirth = (body.dateOfBirth as string | null) ?? null
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined
    if ('email' in body) {
      if (!email) return errorResponse(400, 'Este campo es obligatorio', request)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return errorResponse(400, 'Ingresá un correo válido, por ejemplo nombre@mail.com', request)
      }
    }
    // Mismo correo con otras mayúsculas o espacios: no es un cambio y no pide contraseña
    if (email && email !== customer.email.toLowerCase()) {
      if (recentFailures(account.accountId).length >= MAX_FAILED_ATTEMPTS) {
        return errorResponse(429, TOO_MANY_ATTEMPTS, request, 'TOO_MANY_ATTEMPTS')
      }
      if (!body.currentPassword) {
        return errorResponse(400, 'Ingresá tu contraseña actual para cambiar el correo', request)
      }
      if (body.currentPassword !== passwordOf(account.accountId)) {
        recordFailure(account.accountId)
        return errorResponse(400, CURRENT_PASSWORD_INCORRECT, request, 'CURRENT_PASSWORD_INCORRECT')
      }
      const taken =
        customers.some((item) => item.active && item.id !== customer.id && item.email.toLowerCase() === email) ||
        accounts.some((item) => item.accountId !== account.accountId && item.email.toLowerCase() === email)
      if (taken) return errorResponse(409, 'Ese correo ya está registrado', request, 'EMAIL_IN_USE')
      changes.email = email
    }

    // Recién acá se guarda todo junto (el correo de acceso cambia con el del cliente)
    Object.assign(customer, changes)
    if (changes.email) account.email = changes.email
    return HttpResponse.json(toProfile(customer))
  }),

  // §3.11.1: verifica la actual, valida la nueva y responde 204
  http.patch(`${API_URL}/mi-cuenta/password`, async ({ request }) => {
    await delay(400)
    const account = callerOf(request)
    if (!account) return errorResponse(401, 'Unauthorized', request, 'UNAUTHENTICATED')

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const extra = extraFields(body, PASSWORD_FIELDS)
    if (extra.length > 0) return errorResponse(400, extra, request)
    if (!body.currentPassword || !body.newPassword) {
      return errorResponse(400, 'Este campo es obligatorio', request)
    }

    if (recentFailures(account.accountId).length >= MAX_FAILED_ATTEMPTS) {
      return errorResponse(429, TOO_MANY_ATTEMPTS, request, 'TOO_MANY_ATTEMPTS')
    }
    const current = passwordOf(account.accountId)
    if (body.currentPassword !== current) {
      recordFailure(account.accountId)
      return errorResponse(400, CURRENT_PASSWORD_INCORRECT, request, 'CURRENT_PASSWORD_INCORRECT')
    }

    // Política de §3.11, en el orden de su tabla
    const newPassword = String(body.newPassword)
    if (newPassword.length < 8 || newPassword.length > 64) {
      return errorResponse(400, 'Tiene que tener entre 8 y 64 caracteres', request)
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      return errorResponse(400, 'La contraseña es demasiado larga', request)
    }
    if (newPassword === account.email) {
      return errorResponse(400, 'La contraseña no puede ser igual al mail', request)
    }
    if (newPassword === current) {
      return errorResponse(400, 'La nueva contraseña no puede ser igual a la actual', request, 'PASSWORD_SAME_AS_CURRENT')
    }
    const customer = customers.find((item) => item.id === account.customerId)
    if (customer && newPassword === normalizeDocument(customer.documentNumber)) {
      return errorResponse(400, 'La contraseña no puede ser tu número de documento', request, 'PASSWORD_SAME_AS_DOCUMENT')
    }

    setPassword(account.accountId, newPassword)
    account.mustChangePassword = false
    return new HttpResponse(null, { status: 204 })
  }),
]
