import { delay, http, HttpResponse } from 'msw'
import type {
  Customer,
  CreateCustomerBody,
  CustomerPoints,
  PointsMovement,
  UpdateCustomerBody,
} from '@/features/cashier'
import type { Level } from '@/domain/levels'
import { API_URL } from '@/shared/api/http'
import { accountFromRequest } from './auth.handlers'

// Mismos clientes que backend/prisma/seed.ts, para probar el documento duplicado.
// Se exporta para que el autorregistro (auth.handlers.ts) vea y sume a la misma lista.
export const customers: Customer[] = [
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
  // Dado de baja: sirve para probar que no se puede editar (409) y la reactivación
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
  // Con pasaporte y sin movimientos de puntos (US-46)
  {
    id: 4,
    firstName: 'Sofía',
    lastName: 'Ríos',
    documentType: 'PASSPORT',
    documentNumber: 'AAB123456',
    phone: null,
    email: 'sofia@example.com',
    dateOfBirth: null,
    active: true,
    deactivatedAt: null,
    createdAt: new Date().toISOString(),
  },
]

const STATUS_NAMES = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
}

// Mismo formato que CustomerExceptionFilter del backend (contrato §5).
export const errorResponse = (
  statusCode: 400 | 401 | 403 | 404 | 409,
  message: string | string[],
  path: string,
  code?: string,
) =>
  HttpResponse.json(
    {
      statusCode,
      error: STATUS_NAMES[statusCode],
      message,
      path,
      timestamp: new Date().toISOString(),
      ...(code ? { code } : {}),
    },
    { status: statusCode },
  )

// Empleados activos del mock de empleados: su mail también cuenta como "en uso" (contrato §5).
const STAFF_EMAILS = [
  'ana.gomez@vitto.club',
  'bruno.perez@vitto.club',
  'carla.martinez@vitto.club',
  'lucia.fernandez@vitto.club',
]

// US-17-AJ (§3.11.3): el alta en Caja crea también la cuenta del cliente, con su documento
// como contraseña inicial. Acá queda la contraseña de cada una (id del cliente -> documento);
// el login de auth.handlers.ts la usa y responde mustChangePassword: true.
export const initialPasswords = new Map<number, string>()

// Igual que normalizeDocumentNumber del backend
const normalizeDocument = (value: string) =>
  value.replace(/[\s.-]/g, '').toUpperCase()

// ── Puntos y movimientos (US-46) ─────────────────────────────────────────────
// Los datos respetan las reglas del contrato: balance = Σ remaining (lotes ACTIVE) − deuda,
// lifetimePoints = CONSUMPTION_CREDIT − VOID_REVERSAL, y balanceAfter va encadenado.

const HOUR = 3_600_000
const DAY = 24 * HOUR
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
const inDays = (days: number) => new Date(Date.now() + days * DAY)

// Umbrales por defecto de los niveles (contrato §3.7)
const SILVER_MIN = 300
const GOLD_MIN = 800

type PointsState = {
  balance: number
  lifetimePoints: number
  nextExpirations: { points: number; expiresAt: Date }[]
}

export const pointsByCustomer: Record<number, PointsState> = {
  // Lucía: Oro, con lotes vigentes
  1: {
    balance: 1250,
    lifetimePoints: 1260,
    nextExpirations: [
      { points: 750, expiresAt: inDays(355) },
      { points: 500, expiresAt: inDays(365) },
    ],
  },
  // Martín: saldo negativo por anular un consumo cuyos puntos ya había gastado
  2: { balance: -350, lifetimePoints: 150, nextExpirations: [] },
}

export type MovementSeed = Omit<PointsMovement, 'id' | 'customer'> & { customerId: number }

const BRUNO = { actorType: 'EMPLOYEE', accountId: 2, name: 'Bruno Pérez' } as const
const ANA = { actorType: 'EMPLOYEE', accountId: 1, name: 'Ana Gómez' } as const
const SYSTEM = { actorType: 'SYSTEM', accountId: null, name: 'Sistema' } as const

const lot = (
  id: number,
  accreditedDaysAgo: number,
  status: NonNullable<PointsMovement['lot']>['status'],
): PointsMovement['lot'] => {
  const accredited = new Date(Date.now() - accreditedDaysAgo * DAY)
  const expires = new Date(accredited)
  expires.setUTCMonth(expires.getUTCMonth() + 12)
  return { id, accreditedAt: accredited.toISOString(), expiresAt: expires.toISOString(), status }
}

export const movementSeeds: MovementSeed[] = [
  // Lucía
  { customerId: 1, createdAt: ago(400 * DAY), type: 'CONSUMPTION_CREDIT', points: 10, balanceAfter: 10, description: 'Consumo C-000101', consumptionCode: 'C-000101', reason: null, lot: lot(1, 400, 'EXPIRED'), performedBy: ANA },
  { customerId: 1, createdAt: ago(10 * DAY), type: 'CONSUMPTION_CREDIT', points: 750, balanceAfter: 760, description: 'Consumo C-000120', consumptionCode: 'C-000120', reason: null, lot: lot(2, 10, 'ACTIVE'), performedBy: BRUNO },
  { customerId: 1, createdAt: ago(5 * DAY), type: 'EXPIRATION', points: -10, balanceAfter: 750, description: 'Vencimiento de lote del ' + new Date(Date.now() - 400 * DAY).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Cordoba', day: '2-digit', month: '2-digit', year: 'numeric' }), consumptionCode: null, reason: null, lot: lot(1, 400, 'EXPIRED'), performedBy: SYSTEM },
  { customerId: 1, createdAt: ago(2 * HOUR), type: 'CONSUMPTION_CREDIT', points: 500, balanceAfter: 1250, description: 'Consumo C-000141', consumptionCode: 'C-000141', reason: null, lot: lot(3, 0, 'ACTIVE'), performedBy: BRUNO },
  // Martín
  { customerId: 2, createdAt: ago(5 * DAY), type: 'CONSUMPTION_CREDIT', points: 500, balanceAfter: 500, description: 'Consumo C-000110', consumptionCode: 'C-000110', reason: null, lot: lot(4, 5, 'VOIDED'), performedBy: BRUNO },
  { customerId: 2, createdAt: ago(4 * DAY), type: 'MANUAL_ADJUSTMENT', points: -500, balanceAfter: 0, description: 'Ajuste: Corrección de saldo', consumptionCode: null, reason: 'Corrección de saldo', lot: null, performedBy: ANA },
  { customerId: 2, createdAt: ago(20 * HOUR), type: 'VOID_REVERSAL', points: -500, balanceAfter: -500, description: 'Anulación de C-000110', consumptionCode: 'C-000110', reason: null, lot: null, performedBy: ANA },
  { customerId: 2, createdAt: ago(3 * HOUR), type: 'CONSUMPTION_CREDIT', points: 150, balanceAfter: -350, description: 'Consumo C-000139', consumptionCode: 'C-000139', reason: null, lot: null, performedBy: BRUNO },
]

const LEVEL_ORDER: { level: Level; min: number }[] = [
  { level: 'BRONZE', min: 0 },
  { level: 'SILVER', min: SILVER_MIN },
  { level: 'GOLD', min: GOLD_MIN },
]

// Igual que el cálculo de nivel del backend (contrato §3.4.1)
export function levelOf(lifetimePoints: number): CustomerPoints['level'] {
  const index = LEVEL_ORDER.findLastIndex((l) => lifetimePoints >= l.min)
  const current = LEVEL_ORDER[index]
  const next = LEVEL_ORDER[index + 1] ?? null
  if (!next) {
    return { current: current.level, next: null, currentMinPoints: current.min, nextMinPoints: null, pointsToNext: 0, progressPercent: 100 }
  }
  return {
    current: current.level,
    next: next.level,
    currentMinPoints: current.min,
    nextMinPoints: next.min,
    pointsToNext: next.min - lifetimePoints,
    progressPercent: Math.round(((lifetimePoints - current.min) / (next.min - current.min)) * 100),
  }
}

// 'YYYY-MM-DD' en hora de Argentina
const argentinaDate = (date: Date) =>
  date.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Cordoba' })

/**
 * Reglas comunes de /customers/:id/…: 401 sin token, 403 para el Cliente
 * (solo Cajero y Administrador), 400 con id no numérico y 404 si no existe.
 */
function checkCustomerAccess(request: Request, id: string) {
  const path = new URL(request.url).pathname
  const account = accountFromRequest(request)
  if (!account) return { error: errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED') }
  if (account.role === 'CUSTOMER') {
    return { error: errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN') }
  }
  if (!/^\d+$/.test(id)) {
    return { error: errorResponse(400, 'Validation failed (numeric string is expected)', path) }
  }
  const customer = customers.find((c) => c.id === Number(id))
  if (!customer) return { error: errorResponse(404, `No existe el cliente ${id}.`, path) }
  return { account, customer }
}

export const cashierHandlers = [
  // US-46: GET /api/customers/:id/puntos (contrato §3.4.1)
  http.get<{ id: string }>(`${API_URL}/customers/:id/puntos`, async ({ request, params }) => {
    await delay(250)
    const access = checkCustomerAccess(request, params.id)
    if (access.error) return access.error

    const state = pointsByCustomer[access.customer.id] ?? {
      balance: 0,
      lifetimePoints: 0,
      nextExpirations: [],
    }
    const body: CustomerPoints = {
      customerId: access.customer.id,
      balance: state.balance,
      negativeBalance: state.balance < 0,
      lifetimePoints: state.lifetimePoints,
      level: levelOf(state.lifetimePoints),
      nextExpirations: state.nextExpirations.slice(0, 5).map((e) => ({
        points: e.points,
        expiresAt: argentinaDate(e.expiresAt),
      })),
    }
    return HttpResponse.json(body)
  }),

  // US-26 (lo usa US-46): GET /api/customers/:id/movimientos (contrato §3.6.1).
  // Al Cajero se le fuerza last24h=true, aunque mande false.
  http.get<{ id: string }>(`${API_URL}/customers/:id/movimientos`, async ({ request, params }) => {
    await delay(250)
    const access = checkCustomerAccess(request, params.id)
    if (access.error) return access.error

    const url = new URL(request.url)
    const last24h =
      access.account.role === 'CASHIER' || url.searchParams.get('last24h') === 'true'
    const type = url.searchParams.get('type')
    const page = Number(url.searchParams.get('page') ?? 1)
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const { customer } = access

    const items = movementSeeds
      .map((seed, index) => ({ seed, id: index + 1 }))
      .filter(({ seed }) => seed.customerId === customer.id)
      .filter(({ seed }) => !last24h || Date.now() - Date.parse(seed.createdAt) <= DAY)
      .filter(({ seed }) => !type || seed.type === type)
      // createdAt descendente y, a igual fecha, id descendente
      .sort((a, b) => b.seed.createdAt.localeCompare(a.seed.createdAt) || b.id - a.id)
      .map(({ seed, id }): PointsMovement => ({
        id,
        createdAt: seed.createdAt,
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          documentType: customer.documentType,
          documentNumber: customer.documentNumber,
        },
        type: seed.type,
        points: seed.points,
        balanceAfter: seed.balanceAfter,
        description: seed.description,
        consumptionCode: seed.consumptionCode,
        reason: seed.reason,
        lot: seed.lot,
        performedBy: seed.performedBy,
      }))

    return HttpResponse.json({
      items: items.slice((page - 1) * limit, page * limit),
      total: items.length,
      page,
      limit,
    })
  }),

  // RF-015: POST /api/customers responde 201 / 400 / 409.
  http.post<never, CreateCustomerBody>(
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

      const exists = customers.some(
        (customer) =>
          customer.documentType === body.documentType &&
          customer.documentNumber === body.documentNumber,
      )
      if (exists) {
        return errorResponse(
          409,
          `An active customer with ${body.documentType} "${body.documentNumber}" already exists`,
          path,
        )
      }
      // §5: EMAIL_IN_USE cuando el mail lo usa otro cliente activo, un empleado u otra cuenta activa
      const email = body.email.trim().toLowerCase()
      const emailTaken =
        STAFF_EMAILS.includes(email) ||
        customers.some(
          (customer) =>
            customer.active && customer.email.toLowerCase() === email,
        )
      if (emailTaken) {
        return errorResponse(
          409,
          'Ya hay un cliente o una cuenta activa con ese mail.',
          path,
          'EMAIL_IN_USE',
        )
      }

      const created: Customer = {
        id: customers.length + 1,
        ...body,
        email,
        phone: body.phone ?? null,
        dateOfBirth: body.dateOfBirth ?? null,
        active: true,
        deactivatedAt: null,
        createdAt: new Date().toISOString(),
      }
      customers.push(created)
      // Se crea también su cuenta: contraseña inicial = documento normalizado (§3.11.3)
      initialPasswords.set(created.id, normalizeDocument(created.documentNumber))
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
    const customer = customers.find(
      (c) =>
        c.documentType === documentType && c.documentNumber === documentNumber,
    )
    if (!customer) {
      return errorResponse(
        404,
        `Customer with ${documentType} "${documentNumber}" not found`,
        url.pathname,
      )
    }
    return HttpResponse.json(customer)
  }),

  // PATCH /api/customers/:id: 200 / 400 (sin cambios) / 404 / 409 (inactivo o documento en uso).
  http.patch<{ id: string }, UpdateCustomerBody>(
    `${API_URL}/customers/:id`,
    async ({ params, request }) => {
      await delay(400)
      const path = new URL(request.url).pathname
      const body = await request.json()
      const customer = customers.find((c) => c.id === Number(params.id))

      if (!customer) {
        return errorResponse(404, `Customer with ID ${params.id} not found`, path)
      }
      if (Object.values(body).every((value) => value === undefined)) {
        return errorResponse(400, 'At least one field must be provided', path)
      }
      if (!customer.active) {
        return errorResponse(
          409,
          `Customer with ID ${customer.id} is inactive: reactivate it before modifying`,
          path,
        )
      }

      const documentType = body.documentType ?? customer.documentType
      const documentNumber = body.documentNumber
        ? normalizeDocument(body.documentNumber)
        : customer.documentNumber
      const taken = customers.some(
        (c) =>
          c.id !== customer.id &&
          c.documentType === documentType &&
          c.documentNumber === documentNumber,
      )
      if (taken) {
        return errorResponse(
          409,
          `An active customer with ${documentType} "${documentNumber}" already exists`,
          path,
        )
      }

      Object.assign(customer, {
        ...body,
        documentType,
        documentNumber,
      })
      return HttpResponse.json(customer)
    },
  ),
]
