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
import { customers, errorResponse, movementSeeds, pointsByCustomer } from './cashier.handlers'
import { REDEMPTION_DURATION, redemptionSeeds as seeds, type Seed } from './redemptions.seed'
import { isAvailable, rewardSeeds } from './rewards.seed'

const MINUTE = 60_000

const EMPLOYEE = { accountId: 4, name: 'Diego Sosa' }
const SYSTEM = { actorType: 'SYSTEM', accountId: null, name: 'Sistema' } as const

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
        : (seed.usedAt ?? seed.createdAt + 4 * MINUTE)
  const byEmployee =
    seed.status === 'USED' || (seed.status === 'REJECTED' && !seed.systemRejected)
  const balanceBefore = seed.balanceBefore ?? 480
  return {
    id: seed.id,
    code: seed.code,
    createdAt: new Date(seed.createdAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    status: seed.status,
    reward: { id: seed.rewardId ?? seed.id, name: seed.rewardName, points: seed.points },
    customer: customerOf(seed.customerId),
    origin,
    confirmedBy: origin === 'COUNTER' ? (seed.confirmedBy ?? EMPLOYEE) : null,
    resolvedAt: resolvedTs === null ? null : new Date(resolvedTs).toISOString(),
    resolvedBy: seed.systemRejected
      ? SYSTEM
      : byEmployee
        ? { actorType: 'EMPLOYEE', ...(seed.usedBy ?? EMPLOYEE) }
        : seed.status === 'EXPIRED'
          ? SYSTEM
          : null,
    rejectionReason: seed.status === 'REJECTED' ? (seed.reason ?? null) : null,
    balanceBefore: seed.status === 'USED' ? balanceBefore : null,
    balanceAfter: seed.status === 'USED' ? balanceBefore - seed.points : null,
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

// --- Confirmar canje (US-40, §3.7.1). Confirmar no descuenta nada: ni saldo ni stock. ---

// Alfabeto del código (§3.6.1): sin 0, O, 1 ni I
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function newCode() {
  let code: string
  do {
    code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * 32)]).join('')
  } while (seeds.some((seed) => seed.code === code))
  return code
}

// Validaciones de `rewardId` del body, en el orden del contrato (paso 1) y sin campos de más
function checkConfirmBody(body: Record<string, unknown>, path: string) {
  const extra = Object.keys(body).filter((key) => key !== 'rewardId')
  if (extra.length) {
    return errorResponse(400, extra.map((key) => `property ${key} should not exist`), path)
  }
  if (body.rewardId === undefined || body.rewardId === null || body.rewardId === '') {
    return errorResponse(400, 'Completá este campo.', path)
  }
  if (typeof body.rewardId !== 'number' || !Number.isInteger(body.rewardId) || body.rewardId < 1) {
    return errorResponse(400, 'Ingresá un número entero mayor a 0.', path)
  }
  return null
}

// Pasos 2 y 3: cliente activo, y recompensa que existe, no dada de baja y disponible
function confirmRedemption(
  customerId: number,
  rewardId: number,
  path: string,
  confirmedBy: { accountId: number; name: string } | null,
) {
  const customer = customers.find((item) => item.id === customerId)
  if (!customer) return { error: errorResponse(404, `No existe el cliente ${customerId}.`, path) }
  if (!customer.active) {
    return { error: errorResponse(409, 'El cliente está dado de baja.', path, 'CUSTOMER_INACTIVE') }
  }
  const reward = rewardSeeds.find((item) => item.id === rewardId)
  if (!reward || reward.status === 'DELETED') {
    return { error: errorResponse(404, 'No existe la recompensa.', path) }
  }
  if (!isAvailable(reward)) {
    return {
      error: errorResponse(409, 'La recompensa ya no está disponible.', path, 'REWARD_NOT_AVAILABLE'),
    }
  }
  // Se guarda con el snapshot del nombre y de los puntos; el saldo no se valida (S4-2)
  const seed: Seed = {
    id: Math.max(...seeds.map((item) => item.id)) + 1,
    code: newCode(),
    customerId,
    rewardId: reward.id,
    rewardName: reward.name,
    points: reward.points,
    status: 'CONFIRMED',
    createdAt: Date.now(),
    origin: confirmedBy ? 'COUNTER' : 'APP',
    ...(confirmedBy ? { confirmedBy } : {}),
  }
  seeds.push(seed)
  return { seed }
}

export const confirmRedemptionHandlers = [
  // Cliente: el cliente sale del token. Solo del Cliente.
  http.post(`${API_URL}/customers/me/canjes`, async ({ request }) => {
    await delay(400)
    const path = new URL(request.url).pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role !== 'CUSTOMER' || account.customerId === undefined) return forbidden(path)

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const invalid = checkConfirmBody(body, path)
    if (invalid) return invalid

    const result = confirmRedemption(account.customerId, body.rewardId as number, path, null)
    if (result.error) return result.error
    return HttpResponse.json({ redemption: toMyRedemption(toRedemption(result.seed)) }, { status: 201 })
  }),

  // Caja: en nombre del cliente. Solo Cajero y Administrador; `confirmedBy` es el empleado.
  http.post<{ id: string }>(`${API_URL}/customers/:id/canjes`, async ({ params, request }) => {
    await delay(400)
    const path = new URL(request.url).pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role === 'CUSTOMER') return forbidden(path)

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const invalid = checkConfirmBody(body, path)
    if (invalid) return invalid

    const result = confirmRedemption(Number(params.id), body.rewardId as number, path, {
      accountId: account.accountId,
      name: `${account.firstName} ${account.lastName}`,
    })
    if (result.error) return result.error
    return HttpResponse.json({ redemption: toRedemption(result.seed) }, { status: 201 })
  }),
]

// --- Registrar uso (US-42, §3.9.1). Recién acá se descuentan los puntos y el stock. ---

const REDEMPTION_STATUS_LABELS: Record<RedemptionStatus, string> = {
  CONFIRMED: 'Confirmado',
  USED: 'Utilizado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Vencido',
}

// Mismo código, normalizado como el de los empleados: mayúsculas, sin espacios ni guiones (§3.6.1)
const normalizeCode = (value: string) => value.replace(/[\s-]/g, '').toUpperCase()

export const registerUseHandlers = [
  http.patch<{ code: string }>(`${API_URL}/canjes/:code/usar`, async ({ params, request }) => {
    await delay(400)
    const path = new URL(request.url).pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role === 'CUSTOMER') return forbidden(path)

    // 1. El canje existe
    const seed = seeds.find((item) => item.code === normalizeCode(params.code))
    if (!seed) return errorResponse(404, 'Código no encontrado.', path)

    // 2. Si estaba Confirmado y venció, pasa a Vencido y el uso falla
    if (seed.status === 'CONFIRMED' && seed.createdAt + REDEMPTION_DURATION <= Date.now()) {
      seed.status = 'EXPIRED'
      return errorResponse(
        409,
        'El canje venció. El cliente tiene que pedirlo de nuevo.',
        path,
        'REDEMPTION_EXPIRED',
      )
    }
    // 3. Tiene que seguir Confirmado
    if (seed.status !== 'CONFIRMED') {
      return errorResponse(
        409,
        `El canje ya está en estado "${REDEMPTION_STATUS_LABELS[seed.status]}".`,
        path,
        'REDEMPTION_NOT_CONFIRMED',
      )
    }
    // 4. El cliente está activo
    const customer = customers.find((item) => item.id === seed.customerId)
    if (!customer?.active) {
      return errorResponse(409, 'El cliente está dado de baja.', path, 'CUSTOMER_INACTIVE')
    }
    // 5. La recompensa está disponible (si no, el canje sigue Confirmado y se puede rechazar)
    const reward = rewardSeeds.find((item) =>
      seed.rewardId ? item.id === seed.rewardId : item.name === seed.rewardName,
    )
    if (!reward || !isAvailable(reward)) {
      return errorResponse(
        409,
        'La recompensa ya no está disponible. Podés rechazar el canje.',
        path,
        'REWARD_NOT_AVAILABLE',
      )
    }
    // 6. Saldo real: alcanza y no es negativo
    const state = pointsByCustomer[customer.id]
    const balance = state?.balance ?? 0
    if (balance < 0 || balance < seed.points) {
      return errorResponse(
        409,
        'El cliente no tiene saldo suficiente para este canje. Podés rechazarlo.',
        path,
        'INSUFFICIENT_BALANCE',
      )
    }

    // 7 a 10. Descuenta los puntos del canje (snapshot), registra el movimiento, baja el stock y
    // pasa el canje a Utilizado. No cambia `lifetimePoints`: canjear no baja el nivel.
    const employee = { accountId: account.accountId, name: `${account.firstName} ${account.lastName}` }
    const balanceAfter = balance - seed.points
    state.balance = balanceAfter
    movementSeeds.push({
      customerId: customer.id,
      createdAt: new Date().toISOString(),
      type: 'REDEMPTION',
      points: -seed.points,
      balanceAfter,
      description: `Canje: ${seed.rewardName}`,
      consumptionCode: null,
      redemptionCode: seed.code,
      reason: null,
      lot: null,
      performedBy: { actorType: 'EMPLOYEE', ...employee },
    })
    reward.usedCount += 1
    if (reward.stock !== null) {
      reward.stock -= 1
      if (reward.stock === 0) {
        reward.status = 'DISABLED'
        reward.disabledReason = 'OUT_OF_STOCK'
      }
    }
    seed.status = 'USED'
    seed.usedBy = employee
    seed.usedAt = Date.now()
    seed.balanceBefore = balance

    return HttpResponse.json({
      redemption: toRedemption(seed),
      balanceBefore: balance,
      balanceAfter,
    })
  }),
]

// --- Rechazar y cancelar (US-43, §3.10). Sin reintegro: no se toca saldo, movimientos ni stock. ---

// Motivo del rechazo (§3.10.1): obligatorio, se recorta, de 5 a 500 caracteres, sin campos de más
function checkRejectBody(body: Record<string, unknown>, path: string) {
  const extra = Object.keys(body).filter((key) => key !== 'reason')
  if (extra.length) {
    return errorResponse(400, extra.map((key) => `property ${key} should not exist`), path)
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (!reason) return errorResponse(400, 'El motivo es obligatorio.', path)
  if (reason.length < 5) return errorResponse(400, 'Indicá un motivo de al menos 5 caracteres.', path)
  if (reason.length > 500) {
    return errorResponse(400, 'El motivo no puede superar los 500 caracteres.', path)
  }
  return null
}

// Vence al leer (§3.11): si estaba Confirmado y pasó el plazo, queda Vencido
function expireIfDue(seed: Seed) {
  if (seed.status === 'CONFIRMED' && seed.createdAt + REDEMPTION_DURATION <= Date.now()) {
    seed.status = 'EXPIRED'
    return true
  }
  return false
}

export const rejectCancelHandlers = [
  // Rechazar (CA-43.1 a CA-43.3 y CA-43.8): Cajero y Administrador; el Cliente recibe 403.
  http.patch<{ code: string }>(`${API_URL}/canjes/:code/rechazar`, async ({ params, request }) => {
    await delay(400)
    const path = new URL(request.url).pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role === 'CUSTOMER') return forbidden(path)

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const invalid = checkRejectBody(body, path)
    if (invalid) return invalid

    const seed = seeds.find((item) => item.code === normalizeCode(params.code))
    if (!seed) return errorResponse(404, 'Código no encontrado.', path)
    if (expireIfDue(seed)) {
      return errorResponse(
        409,
        'El canje venció. El cliente tiene que pedirlo de nuevo.',
        path,
        'REDEMPTION_EXPIRED',
      )
    }
    if (seed.status !== 'CONFIRMED') {
      return errorResponse(
        409,
        `El canje ya está en estado "${REDEMPTION_STATUS_LABELS[seed.status]}".`,
        path,
        'REDEMPTION_NOT_CONFIRMED',
      )
    }

    seed.status = 'REJECTED'
    seed.reason = (body.reason as string).trim()
    seed.usedBy = { accountId: account.accountId, name: `${account.firstName} ${account.lastName}` }
    seed.usedAt = Date.now()
    return HttpResponse.json({ redemption: toRedemption(seed) })
  }),

  // Cancelar (CA-43.4 a CA-43.6 y CA-43.8): solo el Cliente dueño. Uno ajeno responde 404, igual
  // que uno que no existe, para no revelar que existe.
  http.patch<{ code: string }>(
    `${API_URL}/customers/me/canjes/:code/cancelar`,
    async ({ params, request }) => {
      await delay(400)
      const path = new URL(request.url).pathname
      const account = accountFromRequest(request)
      if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
      if (account.role !== 'CUSTOMER' || account.customerId === undefined) return forbidden(path)

      const seed = seeds.find(
        (item) =>
          item.code === normalizeCode(params.code) && item.customerId === account.customerId,
      )
      if (!seed) return errorResponse(404, 'No existe el canje.', path)
      if (expireIfDue(seed)) {
        return errorResponse(409, 'El canje ya venció.', path, 'REDEMPTION_EXPIRED')
      }
      if (seed.status !== 'CONFIRMED') {
        return errorResponse(
          409,
          'El canje ya no se puede cancelar.',
          path,
          'REDEMPTION_NOT_CONFIRMED',
        )
      }

      seed.status = 'CANCELLED'
      seed.usedAt = Date.now()
      return HttpResponse.json({ redemption: toMyRedemption(toRedemption(seed)) })
    },
  ),
]
