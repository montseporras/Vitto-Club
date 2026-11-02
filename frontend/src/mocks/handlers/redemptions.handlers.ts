// Mocks de consultar canjes (US-45, contrato del Sprint 4 §3.12): GET /customers/me/canjes (Mis
// canjes del Cliente), GET /customers/:id/canjes (canjes para usar ahora, Cajero y Administrador)
// y GET /canjes (pantalla Canjes del Administrador).
// Simulan lo que hace el backend: los canjes Confirmados vencidos pasan a Vencido al leer (§3.11),
// el Cliente no recibe datos de empleados ni saldos, y cada ruta tiene sus roles.
import { delay, http, HttpResponse } from 'msw'
import type {
  MyRedemption,
  Redemption,
  RedemptionStatus,
} from '@/features/redemptions'
import { API_URL } from '@/shared/api/http'
import { accountFromRequest } from './auth.handlers'
import { customers, errorResponse } from './cashier.handlers'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const REDEMPTION_DURATION = 15 * MINUTE

const EMPLOYEE = { accountId: 4, name: 'Diego Sosa' }
const SYSTEM = { actorType: 'SYSTEM', accountId: null, name: 'Sistema' } as const

type Seed = {
  id: number
  code: string
  customerId: number
  rewardName: string
  points: number
  status: RedemptionStatus
  createdAt: number
  origin?: 'APP' | 'COUNTER'
  reason?: string
}

const now = Date.now()

// Para ver el estado vacío ("Todavía no tenés canjes."), vaciar los canjes de la cuenta del Cliente.
// Las cuentas demo: Lucía (cliente 1), Martín (cliente 2). Sofía (cliente 4) tiene pasaporte.
const seeds: Seed[] = [
  // Confirmados: uno con mucho tiempo y uno que vence enseguida (para ver la cuenta llegar a 0)
  { id: 1, code: 'K7MP2X', customerId: 1, rewardName: 'Café con medialuna', points: 150, status: 'CONFIRMED', createdAt: now - 1 * MINUTE },
  { id: 2, code: 'Q4TN8B', customerId: 1, rewardName: 'Porción de torta', points: 300, status: 'CONFIRMED', createdAt: now - 13.5 * MINUTE, origin: 'COUNTER' },
  { id: 3, code: 'H9ZW3D', customerId: 4, rewardName: 'Café con medialuna', points: 150, status: 'CONFIRMED', createdAt: now - 6 * MINUTE },
  // Finalizados
  { id: 4, code: 'M2RC6F', customerId: 1, rewardName: 'Café con medialuna', points: 150, status: 'USED', createdAt: now - 1 * DAY, origin: 'COUNTER' },
  { id: 5, code: 'P5VY7G', customerId: 1, rewardName: 'Desayuno completo', points: 400, status: 'REJECTED', createdAt: now - 2 * DAY, reason: 'La recompensa se agotó.' },
  { id: 6, code: 'R8XA4J', customerId: 1, rewardName: 'Porción de torta', points: 300, status: 'CANCELLED', createdAt: now - 3 * DAY },
  { id: 7, code: 'T3EB9K', customerId: 1, rewardName: 'Café con medialuna', points: 150, status: 'EXPIRED', createdAt: now - 9 * DAY },
  { id: 8, code: 'W6FH2L', customerId: 2, rewardName: 'Sandwich de miga', points: 200, status: 'USED', createdAt: now - 5 * DAY },
  { id: 9, code: 'N7CJ5M', customerId: 2, rewardName: 'Desayuno completo', points: 400, status: 'EXPIRED', createdAt: now - 40 * DAY },
  // Recompensa dada de baja: se encuentra igual por nombre (snapshot)
  { id: 10, code: 'L4DK8P', customerId: 4, rewardName: 'Combo Navidad', points: 500, status: 'USED', createdAt: now - 20 * DAY, origin: 'COUNTER' },
  // Más canjes para ver el paginado de a 10
  ...Array.from({ length: 8 }, (_, index): Seed => ({
    id: 11 + index,
    code: `A${index + 2}BC${index + 3}D`,
    customerId: (index % 2) + 1,
    rewardName: index % 2 ? 'Sandwich de miga' : 'Café con medialuna',
    points: index % 2 ? 200 : 150,
    status: 'USED',
    createdAt: now - (index + 6) * DAY,
  })),
]

const customerOf = (customerId: number) => {
  const customer = customers.find((item) => item.id === customerId)!
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    documentType: customer.documentType,
    documentNumber: customer.documentNumber,
  }
}

function toRedemption(seed: Seed): Redemption {
  const expiresAt = seed.createdAt + REDEMPTION_DURATION
  const origin = seed.origin ?? 'APP'
  // Hora en que se resolvió: el uso y el rechazo a los pocos minutos; el vencimiento, a la hora exacta
  const resolvedTs =
    seed.status === 'EXPIRED'
      ? expiresAt
      : seed.status === 'CONFIRMED'
        ? null
        : seed.createdAt + 4 * MINUTE
  const byEmployee = seed.status === 'USED' || seed.status === 'REJECTED'
  return {
    id: seed.id,
    code: seed.code,
    createdAt: new Date(seed.createdAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    status: seed.status,
    reward: { id: seed.id, name: seed.rewardName, points: seed.points },
    customer: customerOf(seed.customerId),
    origin,
    confirmedBy: origin === 'COUNTER' ? EMPLOYEE : null,
    resolvedAt: resolvedTs === null ? null : new Date(resolvedTs).toISOString(),
    resolvedBy: byEmployee
      ? { actorType: 'EMPLOYEE', ...EMPLOYEE }
      : seed.status === 'EXPIRED'
        ? SYSTEM
        : null,
    rejectionReason: seed.status === 'REJECTED' ? (seed.reason ?? null) : null,
    balanceBefore: seed.status === 'USED' ? 480 : null,
    balanceAfter: seed.status === 'USED' ? 480 - seed.points : null,
  }
}

// Vence al leer (§3.11): antes de cualquier listado, los Confirmados con expiresAt pasado se vencen
function expireOnRead() {
  const current = Date.now()
  for (const seed of seeds) {
    if (seed.status === 'CONFIRMED' && seed.createdAt + REDEMPTION_DURATION <= current) {
      seed.status = 'EXPIRED'
    }
  }
}

// El Cliente no recibe customer, origin, confirmedBy, resolvedBy ni los saldos; sí canCancel
function toMyRedemption(redemption: Redemption): MyRedemption {
  const mine: MyRedemption = {
    id: redemption.id,
    code: redemption.code,
    createdAt: redemption.createdAt,
    expiresAt: redemption.expiresAt,
    status: redemption.status,
    reward: redemption.reward,
    resolvedAt: redemption.resolvedAt,
    rejectionReason: redemption.rejectionReason,
    canCancel: redemption.status === 'CONFIRMED' && new Date(redemption.expiresAt).getTime() > Date.now(),
  }
  return mine
}

const forbidden = (path: string) =>
  errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN')

// 'YYYY-MM-DD' en hora de Argentina, para los filtros de fecha
const argentinaDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

// Sin tildes ni mayúsculas, para buscar por nombre de recompensa
const fold = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Documento y código se normalizan: sin puntos, espacios ni guiones, en mayúsculas
const normalize = (value: string) => value.replace(/[^0-9A-Za-z]/g, '').toUpperCase()

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Fechas y orden comunes a Mis canjes y a la pantalla del Administrador. */
function filterByDatesAndOrder(seedsToFilter: Seed[], params: URLSearchParams, path: string) {
  const fromDate = params.get('fromDate')
  const toDate = params.get('toDate')
  for (const value of [fromDate, toDate]) {
    if (value !== null && !DATE_PATTERN.test(value)) {
      return { error: errorResponse(400, 'La fecha debe tener el formato AAAA-MM-DD.', path) }
    }
  }
  if (fromDate && toDate && fromDate > toDate) {
    return { error: errorResponse(400, 'La fecha "hasta" no puede ser anterior a "desde".', path) }
  }
  const order = params.get('order') ?? 'desc'
  if (order !== 'asc' && order !== 'desc') {
    return { error: errorResponse(400, 'order must be one of the following values: asc, desc', path) }
  }
  const filtered = seedsToFilter
    .filter((seed) => {
      const day = argentinaDate(seed.createdAt)
      return (!fromDate || day >= fromDate) && (!toDate || day <= toDate)
    })
    .sort((a, b) => (order === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt))
  return { seeds: filtered }
}

function paginate<TItem>(items: TItem[], params: URLSearchParams, defaultLimit: number) {
  const page = Math.max(1, Number(params.get('page') ?? 1))
  const limit = Math.max(1, Number(params.get('limit') ?? defaultLimit))
  return { items: items.slice((page - 1) * limit, page * limit), total: items.length, page, limit }
}

export const redemptionsHandlers = [
  // US-45, CA-45.1 y CA-45.2: Mis canjes. Solo del Cliente.
  http.get(`${API_URL}/customers/me/canjes`, async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const path = url.pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role !== 'CUSTOMER' || account.customerId === undefined) return forbidden(path)

    const status = url.searchParams.get('status')
    if (status !== null && status !== 'CONFIRMED' && status !== 'FINISHED') {
      return errorResponse(400, 'status must be one of the following values: CONFIRMED, FINISHED', path)
    }

    expireOnRead()
    const own = seeds.filter(
      (seed) =>
        seed.customerId === account.customerId &&
        (status === null ||
          (status === 'CONFIRMED' ? seed.status === 'CONFIRMED' : seed.status !== 'CONFIRMED')),
    )
    const result = filterByDatesAndOrder(own, url.searchParams, path)
    if (result.error) return result.error
    const page = paginate(result.seeds.map((seed) => toMyRedemption(toRedemption(seed))), url.searchParams, 20)
    return HttpResponse.json(page)
  }),

  // US-45, CA-45.6: canjes para usar ahora. Cajero y Administrador; solo Confirmados vigentes, el
  // que vence primero arriba, sin paginado.
  http.get<{ id: string }>(`${API_URL}/customers/:id/canjes`, async ({ params, request }) => {
    await delay(250)
    const path = new URL(request.url).pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role === 'CUSTOMER') return forbidden(path)

    const customer = customers.find((item) => item.id === Number(params.id))
    if (!customer) return errorResponse(404, `No existe el cliente ${params.id}.`, path)
    // Un cliente dado de baja: sus canjes se rechazaron al darlo de baja, la lista viene vacía
    if (!customer.active) return HttpResponse.json([])

    expireOnRead()
    const items = seeds
      .filter((seed) => seed.customerId === customer.id && seed.status === 'CONFIRMED')
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(toRedemption)
    return HttpResponse.json(items)
  }),

  // US-45, CA-45.7 y CA-45.10: pantalla Canjes del Administrador. El Cajero recibe 403.
  http.get(`${API_URL}/canjes`, async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const path = url.pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role !== 'ADMIN') return forbidden(path)

    const params = url.searchParams
    const documentNumber = normalize(params.get('documentNumber') ?? '')
    // El tipo solo se aplica si viene el número (por defecto DNI)
    const documentType = params.get('documentType') ?? 'DNI'
    const code = normalize(params.get('code') ?? '')
    const rewardName = fold((params.get('rewardName') ?? '').trim())
    const status = params.get('status')
    if (status !== null && !['CONFIRMED', 'USED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(status)) {
      return errorResponse(
        400,
        'status must be one of the following values: CONFIRMED, USED, REJECTED, CANCELLED, EXPIRED',
        path,
      )
    }

    expireOnRead()
    const matching = seeds.filter((seed) => {
      const customer = customerOf(seed.customerId)
      return (
        (!status || seed.status === status) &&
        (!code || seed.code.includes(code)) &&
        (!rewardName || fold(seed.rewardName).includes(rewardName)) &&
        (!documentNumber ||
          (customer.documentType === documentType &&
            normalize(customer.documentNumber).includes(documentNumber)))
      )
    })
    const result = filterByDatesAndOrder(matching, params, path)
    if (result.error) return result.error
    return HttpResponse.json(paginate(result.seeds.map(toRedemption), params, 20))
  }),
]
