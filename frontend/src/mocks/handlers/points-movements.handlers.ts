import { delay, http, HttpResponse } from 'msw'
import type {
  CustomerPointsMovement,
  PointsMovement,
  PointsMovementCustomer,
  PointsMovementPage,
  PointsMovementType,
} from '@/features/points-movements'
import { API_URL } from '@/shared/api/http'
import { customers } from './cashier.handlers'
import { getMockCurrentUser } from './auth.handlers'

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

const customerReference = (customerId: number) => {
  const customer = customers.find((entry) => entry.id === customerId)
  if (!customer) {
    throw new Error(`Mock points movement references unknown customer ${customerId}`)
  }
  const { id, firstName, lastName, documentType, documentNumber } = customer
  return {
    id,
    firstName,
    lastName,
    documentType,
    documentNumber,
  } satisfies PointsMovementCustomer
}

const recentMovementRows: PointsMovement[] = [
  {
    id: 6,
    createdAt: hoursAgo(2),
    customer: customerReference(1),
    type: 'CONSUMPTION_CREDIT',
    points: 250,
    balanceAfter: 1250,
    description: 'Consumo C-000131',
    consumptionCode: 'C-000131',
    reason: null,
    lot: {
      id: 31,
      accreditedAt: hoursAgo(2),
      expiresAt: '2027-10-23T00:00:00.000Z',
      status: 'ACTIVE',
    },
    performedBy: {
      actorType: 'EMPLOYEE',
      accountId: 2,
      name: 'Bruno Pérez',
    },
  },
  {
    id: 5,
    createdAt: hoursAgo(10),
    customer: customerReference(1),
    type: 'VOID_REVERSAL',
    points: -80,
    balanceAfter: 1000,
    description: 'Anulación de C-000132',
    consumptionCode: 'C-000132',
    reason: null,
    lot: null,
    performedBy: {
      actorType: 'EMPLOYEE',
      accountId: 2,
      name: 'Bruno Pérez',
    },
  },
  {
    id: 4,
    createdAt: hoursAgo(30),
    customer: customerReference(1),
    type: 'MANUAL_ADJUSTMENT',
    points: 30,
    balanceAfter: 1080,
    description: 'Ajuste: Atención por demora',
    consumptionCode: null,
    reason: 'Atención por demora',
    lot: {
      id: 30,
      accreditedAt: hoursAgo(30),
      expiresAt: '2027-10-23T00:00:00.000Z',
      status: 'ACTIVE',
    },
    performedBy: {
      actorType: 'EMPLOYEE',
      accountId: 1,
      name: 'Ana Gómez',
    },
  },
  {
    id: 3,
    createdAt: hoursAgo(72),
    customer: customerReference(1),
    type: 'EXPIRATION',
    points: -20,
    balanceAfter: 1050,
    description: 'Vencimiento de lote del 16/08/2026',
    consumptionCode: null,
    reason: null,
    lot: {
      id: 18,
      accreditedAt: '2025-08-16T12:00:00.000Z',
      expiresAt: '2026-08-16T12:00:00.000Z',
      status: 'EXPIRED',
    },
    performedBy: { actorType: 'SYSTEM', accountId: null, name: 'Sistema' },
  },
  {
    id: 2,
    createdAt: hoursAgo(6),
    customer: customerReference(2),
    type: 'CONSUMPTION_CREDIT',
    points: 65,
    balanceAfter: 65,
    description: 'Consumo C-000133',
    consumptionCode: 'C-000133',
    reason: null,
    lot: {
      id: 32,
      accreditedAt: hoursAgo(6),
      expiresAt: '2027-10-23T00:00:00.000Z',
      status: 'ACTIVE',
    },
    performedBy: {
      actorType: 'EMPLOYEE',
      accountId: 2,
      name: 'Bruno Pérez',
    },
  },
]

const historicalCredits: PointsMovement[] = Array.from(
  { length: 20 },
  (_, index) => {
    const createdAt = hoursAgo(200 + index * 24)
    const code = `C-${String(134 + index).padStart(6, '0')}`
    return {
      id: 100 + index,
      createdAt,
      customer: customerReference(1),
      type: 'CONSUMPTION_CREDIT',
      points: 40 + index,
      balanceAfter: 800 + index * 40,
      description: `Consumo ${code}`,
      consumptionCode: code,
      reason: null,
      lot: {
        id: 40 + index,
        accreditedAt: createdAt,
        expiresAt: '2027-10-23T00:00:00.000Z',
        status: 'ACTIVE',
      },
      performedBy: {
        actorType: 'EMPLOYEE',
        accountId: 2,
        name: 'Bruno Pérez',
      },
    }
  },
)

const movementRows = [...recentMovementRows, ...historicalCredits]

const errorResponse = (
  statusCode: 401 | 403 | 404,
  error: string,
  message: string,
  code: string,
  request: Request,
) =>
  HttpResponse.json(
    {
      statusCode,
      error,
      message,
      path: new URL(request.url).pathname,
      timestamp: new Date().toISOString(),
      code,
    },
    { status: statusCode },
  )

const unauthorized = (request: Request) =>
  errorResponse(
    401,
    'Unauthorized',
    'La sesión no es válida',
    'UNAUTHENTICATED',
    request,
  )

const forbidden = (request: Request) =>
  errorResponse(
    403,
    'Forbidden',
    'Forbidden resource',
    'FORBIDDEN',
    request,
  )

const dateInArgentina = (value: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

const paginate = <TItem>(
  items: TItem[],
  page: number,
  limit: number,
): PointsMovementPage<TItem> => ({
  items: items.slice((page - 1) * limit, page * limit),
  total: items.length,
  page,
  limit,
})

const pageParams = (url: URL, defaultLimit: number) => ({
  page: Number(url.searchParams.get('page') ?? 1),
  limit: Number(url.searchParams.get('limit') ?? defaultLimit),
})

const sorted = (items: PointsMovement[]) =>
  [...items].sort(
    (left, right) =>
      right.createdAt.localeCompare(left.createdAt) || right.id - left.id,
  )

const toCustomerMovement = ({
  id,
  createdAt,
  type,
  points,
  balanceAfter,
  description,
  consumptionCode,
  reason,
  lot,
}: PointsMovement): CustomerPointsMovement => ({
  id,
  createdAt,
  type,
  points,
  balanceAfter,
  description,
  consumptionCode,
  reason,
  lot,
})

export const pointsMovementsHandlers = [
  http.get(`${API_URL}/movimientos-de-puntos`, async ({ request }) => {
    await delay(300)
    const user = getMockCurrentUser()
    if (!user) return unauthorized(request)
    if (user.role !== 'ADMIN') return forbidden(request)

    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.toLocaleLowerCase() ?? ''
    const fromDate = url.searchParams.get('fromDate')
    const toDate = url.searchParams.get('toDate')
    const type = url.searchParams.get('type') as PointsMovementType | null
    const { page, limit } = pageParams(url, 10)

    const filtered = sorted(movementRows).filter((movement) => {
      const customerName =
        `${movement.customer.firstName} ${movement.customer.lastName}`.toLocaleLowerCase()
      const documentNumber = movement.customer.documentNumber.toLocaleLowerCase()
      const date = dateInArgentina(movement.createdAt)
      return (
        (!q || customerName.includes(q) || documentNumber.includes(q)) &&
        (!fromDate || date >= fromDate) &&
        (!toDate || date <= toDate) &&
        (!type || movement.type === type)
      )
    })

    return HttpResponse.json(paginate(filtered, page, limit))
  }),

  http.get(`${API_URL}/customers/me/movimientos`, async ({ request }) => {
    await delay(250)
    const user = getMockCurrentUser()
    if (!user) return unauthorized(request)
    if (user.role !== 'CUSTOMER' || user.customerId === undefined) {
      return forbidden(request)
    }

    const url = new URL(request.url)
    const type = url.searchParams.get('type') as PointsMovementType | null
    const { page, limit } = pageParams(url, 20)
    const items = sorted(movementRows)
      .filter(
        (movement) =>
          movement.customer.id === user.customerId &&
          (!type || movement.type === type),
      )
      .map(toCustomerMovement)

    return HttpResponse.json(paginate(items, page, limit))
  }),
  // GET /customers/:id/movimientos (la ficha) ya lo simula cashier.handlers.ts (US-46)
]
