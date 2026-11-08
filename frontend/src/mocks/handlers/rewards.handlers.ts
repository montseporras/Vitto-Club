// Mocks de recompensas: GET /recompensas/disponibles (mostrador, US-40, contrato del Sprint 4
// §3.5.2) y GET /customers/me/recompensas (catálogo del Cliente, US-39, §3.5.1). Las recompensas de
// ejemplo las comparte la confirmación de canjes (redemptions.handlers.ts).
import { delay, http, HttpResponse } from 'msw'
import type {
  AdminReward,
  CatalogFilter,
  CatalogReward,
  CreateRewardBody,
  Reward,
  RewardListStatus,
} from '@/features/rewards'
import { API_URL } from '@/shared/api/http'
import { accountFromRequest } from './auth.handlers'
import { errorResponse } from './cashier.handlers'
import { myBalanceOf } from './my-account.handlers'
import { rejectConfirmedRedemptionsForReward } from './redemptions.seed'
import { argentinaToday, isAvailable, reward, rewardSeeds } from './rewards.seed'

// Días que faltan para el vencimiento, con la fecha de hoy en Argentina (§3.1)
const daysToExpire = (expiresAt: string | null) =>
  expiresAt === null
    ? null
    : Math.round((Date.parse(expiresAt) - Date.parse(argentinaToday())) / 86_400_000)

// Cómo la ve el Cliente (§3.5.1): sin `confirmedCount` ni `updatedAt`, y una Activa vencida que el
// proceso diario todavía no marcó llega como Deshabilitada / Vencida
function toCatalogReward(item: Reward): CatalogReward {
  const days = daysToExpire(item.expiresAt)
  const expiredByDate = item.status === 'ACTIVE' && days !== null && days < 0
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    points: item.points,
    stock: item.stock,
    expiresAt: item.expiresAt,
    status: item.status,
    disabledReason: item.disabledReason,
    photoUrl: item.photoUrl,
    usedCount: item.usedCount,
    daysToExpire: days,
    ...(expiredByDate ? { status: 'DISABLED', disabledReason: 'EXPIRED' } : {}),
  }
}

const CATALOG_FILTERS: CatalogFilter[] = ['ALL', 'MOST_REDEEMED', 'EXPIRING_SOON']
const ADMIN_STATUSES: RewardListStatus[] = ['ACTIVE', 'DISABLED', 'INACTIVE']

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR')
}

export const rewardsHandlers = [
  // US-34: listado de Administración, con filtros, orden y paginado de §3.2.1.
  http.get(`${API_URL}/recompensas`, async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const path = url.pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role !== 'ADMIN') {
      return errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN')
    }

    const q = url.searchParams.get('q') ?? ''
    const requestedStatus = url.searchParams.get('status') ?? ''
    if (requestedStatus && !ADMIN_STATUSES.includes(requestedStatus as RewardListStatus)) {
      return errorResponse(
        400,
        'status must be one of the following values: ACTIVE, DISABLED, INACTIVE',
        path,
      )
    }

    const requestedPage = Number(url.searchParams.get('page') ?? '1')
    const requestedLimit = Number(url.searchParams.get('limit') ?? '20')
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit >= 1 && requestedLimit <= 100
        ? requestedLimit
        : 20
    const normalizedQuery = normalizeSearch(q)
    const filtered = rewardSeeds
      .filter(
        (item): item is Omit<Reward, 'status'> & { status: RewardListStatus } =>
          item.status !== 'DELETED',
      )
      .filter((item) => !requestedStatus || item.status === requestedStatus)
      .filter((item) => !normalizedQuery || normalizeSearch(item.name).includes(normalizedQuery))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    const items: AdminReward[] = filtered
      .slice((page - 1) * limit, page * limit)
      .map((item) => ({ ...item, confirmedCount: item.confirmedCount ?? 0 }))

    return HttpResponse.json({ items, total: filtered.length, page, limit })
  }),

  // US-34: creación de recompensa. El mock valida el mismo body que la API (§3.2.3).
  http.post(`${API_URL}/recompensas`, async ({ request }) => {
    await delay(300)
    const path = new URL(request.url).pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role !== 'ADMIN') {
      return errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN')
    }

    const bodyValue: unknown = await request.json()
    if (!isRecord(bodyValue)) {
      return errorResponse(400, 'El cuerpo de la solicitud no es válido.', path)
    }
    const allowedFields = ['name', 'description', 'points', 'stock', 'expiresAt']
    const extraField = Object.keys(bodyValue).find((field) => !allowedFields.includes(field))
    if (extraField) {
      return errorResponse(400, `property ${extraField} should not exist`, path)
    }

    for (const field of ['name', 'points', 'stock', 'expiresAt']) {
      if (!Object.hasOwn(bodyValue, field)) {
        return errorResponse(400, 'Completá este campo.', path)
      }
    }

    if (typeof bodyValue.name !== 'string') {
      return errorResponse(400, 'Completá este campo.', path)
    }
    const name = bodyValue.name.trim()
    if (!name) return errorResponse(400, 'Completá este campo.', path)
    if (name.length > 80) return errorResponse(400, 'Máximo 80 caracteres.', path)

    if (
      typeof bodyValue.description !== 'undefined' &&
      bodyValue.description !== null &&
      typeof bodyValue.description !== 'string'
    ) {
      return errorResponse(400, 'description must be a string', path)
    }
    const description =
      typeof bodyValue.description === 'string' ? bodyValue.description.trim() || null : null
    if (description && description.length > 255) {
      return errorResponse(400, 'Máximo 255 caracteres.', path)
    }

    if (typeof bodyValue.points !== 'number' || !Number.isInteger(bodyValue.points)) {
      return errorResponse(400, 'Ingresá un número entero mayor a 0.', path)
    }
    if (bodyValue.points < 1) {
      return errorResponse(400, 'Ingresá un número entero mayor a 0.', path)
    }
    if (bodyValue.points > 1_000_000) {
      return errorResponse(400, 'El máximo es 1.000.000 puntos.', path)
    }

    let stock: number | null
    if (bodyValue.stock === null) {
      stock = null
    } else if (typeof bodyValue.stock !== 'number' || !Number.isInteger(bodyValue.stock)) {
      return errorResponse(400, 'Ingresá un número entero, sin decimales.', path)
    } else if (bodyValue.stock < 1) {
      return errorResponse(400, 'Ingresá un número entero mayor a 0.', path)
    } else if (bodyValue.stock > 100_000) {
      return errorResponse(400, 'El máximo es 100.000.', path)
    } else {
      stock = bodyValue.stock
    }

    let expiresAt: string | null
    if (bodyValue.expiresAt === null) {
      expiresAt = null
    } else if (typeof bodyValue.expiresAt !== 'string') {
      return errorResponse(400, 'Elegí una fecha o marcá «No vence».', path)
    } else if (bodyValue.expiresAt < argentinaToday()) {
      return errorResponse(400, 'La fecha no puede ser anterior a hoy.', path)
    } else {
      expiresAt = bodyValue.expiresAt
    }

    const normalizedName = name.toLocaleLowerCase('es-AR')
    const duplicate = rewardSeeds.some(
      (item) =>
        item.status !== 'DELETED' &&
        item.name.trim().toLocaleLowerCase('es-AR') === normalizedName,
    )
    if (duplicate) {
      return errorResponse(
        409,
        'Ya existe una recompensa con ese nombre.',
        path,
        'REWARD_NAME_IN_USE',
      )
    }

    const body: CreateRewardBody = { name, description, points: bodyValue.points, stock, expiresAt }
    const newReward = reward(
      Math.max(0, ...rewardSeeds.map((item) => item.id)) + 1,
      body.name,
      body.points,
      {
        description: body.description,
        stock: body.stock,
        expiresAt: body.expiresAt,
        daysToExpire: daysToExpire(body.expiresAt),
        photoUrl: null,
        confirmedCount: 0,
        updatedAt: new Date().toISOString(),
      },
    )
    rewardSeeds.unshift(newReward)
    return HttpResponse.json(newReward, { status: 201 })
  }),

  // US-40: recompensas del mostrador. Solo Cajero y Administrador; por puntos ascendentes.
  http.get(`${API_URL}/recompensas/disponibles`, async ({ request }) => {
    await delay(250)
    const path = new URL(request.url).pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role === 'CUSTOMER') {
      return errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN')
    }
    return HttpResponse.json(
      rewardSeeds.filter(isAvailable).sort((a, b) => a.points - b.points || a.name.localeCompare(b.name)),
    )
  }),

  // US-35: detalle de una recompensa del Administrador (§3.2.2).
  http.get(`${API_URL}/recompensas/:id`, async ({ request, params }) => {
    await delay(200)
    const path = new URL(request.url).pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role !== 'ADMIN') {
      return errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN')
    }

    const id = Number(params.id)
    const item = rewardSeeds.find((candidate) => candidate.id === id)
    if (!item || item.status === 'DELETED') {
      return errorResponse(404, 'No existe la recompensa.', path)
    }
    return HttpResponse.json({ ...item, confirmedCount: item.confirmedCount ?? 0 })
  }),

  // US-35: edición de recompensa, con las reglas de §3.2.4.
  http.patch(`${API_URL}/recompensas/:id`, async ({ request, params }) => {
    await delay(250)
    const path = new URL(request.url).pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role !== 'ADMIN') {
      return errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN')
    }

    const id = Number(params.id)
    const item = rewardSeeds.find((candidate) => candidate.id === id)
    if (!item || item.status === 'DELETED') {
      return errorResponse(404, 'No existe la recompensa.', path)
    }

    const bodyValue: unknown = await request.json()
    if (!isRecord(bodyValue)) {
      return errorResponse(400, 'El cuerpo de la solicitud no es válido.', path)
    }
    const allowedFields = ['name', 'description', 'points', 'stock', 'expiresAt']
    const extraField = Object.keys(bodyValue).find((field) => !allowedFields.includes(field))
    if (extraField) {
      return errorResponse(400, `property ${extraField} should not exist`, path)
    }
    if (Object.keys(bodyValue).length === 0) {
      return errorResponse(400, 'Indicá al menos un campo para modificar.', path)
    }

    let name = item.name
    if (Object.hasOwn(bodyValue, 'name')) {
      if (typeof bodyValue.name !== 'string') {
        return errorResponse(400, 'Completá este campo.', path)
      }
      name = bodyValue.name.trim()
      if (!name) return errorResponse(400, 'Completá este campo.', path)
      if (name.length > 80) return errorResponse(400, 'Máximo 80 caracteres.', path)
      const normalizedName = name.toLocaleLowerCase('es-AR')
      const duplicate = rewardSeeds.some(
        (candidate) =>
          candidate.id !== id &&
          candidate.status !== 'DELETED' &&
          candidate.name.trim().toLocaleLowerCase('es-AR') === normalizedName,
      )
      if (duplicate) {
        return errorResponse(
          409,
          'Ya existe una recompensa con ese nombre.',
          path,
          'REWARD_NAME_IN_USE',
        )
      }
    }

    let description = item.description
    if (Object.hasOwn(bodyValue, 'description')) {
      if (bodyValue.description !== null && typeof bodyValue.description !== 'string') {
        return errorResponse(400, 'description must be a string', path)
      }
      description =
        typeof bodyValue.description === 'string' ? bodyValue.description.trim() || null : null
      if (description && description.length > 255) {
        return errorResponse(400, 'Máximo 255 caracteres.', path)
      }
    }

    let points = item.points
    if (Object.hasOwn(bodyValue, 'points')) {
      if (typeof bodyValue.points !== 'number' || !Number.isInteger(bodyValue.points)) {
        return errorResponse(400, 'Ingresá un número entero mayor a 0.', path)
      }
      if (bodyValue.points < 1) {
        return errorResponse(400, 'Ingresá un número entero mayor a 0.', path)
      }
      if (bodyValue.points > 1_000_000) {
        return errorResponse(400, 'El máximo es 1.000.000 puntos.', path)
      }
      points = bodyValue.points
    }

    let stock = item.stock
    if (Object.hasOwn(bodyValue, 'stock')) {
      if (bodyValue.stock === null) {
        stock = null
      } else if (typeof bodyValue.stock !== 'number' || !Number.isInteger(bodyValue.stock)) {
        return errorResponse(400, 'Ingresá un número entero, sin decimales.', path)
      } else if (bodyValue.stock > 100_000) {
        return errorResponse(400, 'El máximo es 100.000.', path)
      } else {
        stock = bodyValue.stock
      }
      if (stock !== null && stock < (item.confirmedCount ?? 0)) {
        const confirmedCount = item.confirmedCount ?? 0
        return errorResponse(
          409,
          `El stock no puede ser menor a los ${confirmedCount} canjes confirmados.`,
          path,
          'STOCK_BELOW_CONFIRMED',
        )
      }
    }

    let expiresAt = item.expiresAt
    if (Object.hasOwn(bodyValue, 'expiresAt')) {
      if (bodyValue.expiresAt === null) {
        expiresAt = null
      } else if (typeof bodyValue.expiresAt !== 'string') {
        return errorResponse(400, 'Elegí una fecha o marcá «No vence».', path)
      } else if (bodyValue.expiresAt < argentinaToday()) {
        return errorResponse(400, 'La fecha no puede ser anterior a hoy.', path)
      } else {
        expiresAt = bodyValue.expiresAt
      }
    }

    item.name = name
    item.description = description
    item.points = points
    item.stock = stock
    item.expiresAt = expiresAt
    item.daysToExpire = daysToExpire(expiresAt)
    item.updatedAt = new Date().toISOString()

    let availabilityChange: 'ENABLED' | 'DISABLED' | null = null
    const nowAvailable =
      (item.stock === null || item.stock > 0) &&
      (item.expiresAt === null || item.expiresAt >= argentinaToday())
    if (item.status === 'DISABLED' && nowAvailable) {
      item.status = 'ACTIVE'
      item.disabledReason = null
      availabilityChange = 'ENABLED'
    } else if (item.status === 'ACTIVE' && item.stock === 0) {
      item.status = 'DISABLED'
      item.disabledReason = 'OUT_OF_STOCK'
      availabilityChange = 'DISABLED'
    }

    return HttpResponse.json({
      reward: { ...item, confirmedCount: item.confirmedCount ?? 0 },
      availabilityChange,
    })
  }),

  // US-36: activar una recompensa, incluso si queda Deshabilitada por falta de disponibilidad.
  http.patch(`${API_URL}/recompensas/:id/activar`, async ({ request, params }) => {
    await delay(250)
    const path = new URL(request.url).pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role !== 'ADMIN') {
      return errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN')
    }

    const id = Number(params.id)
    const item = rewardSeeds.find((candidate) => candidate.id === id)
    if (!item || item.status === 'DELETED') {
      return errorResponse(404, 'No existe la recompensa.', path)
    }
    if (item.status !== 'INACTIVE') {
      return errorResponse(
        409,
        'La recompensa no está inactiva.',
        path,
        'INVALID_REWARD_STATUS',
      )
    }

    const noStock = item.stock === 0
    const expired = item.expiresAt !== null && item.expiresAt < argentinaToday()
    item.status = noStock || expired ? 'DISABLED' : 'ACTIVE'
    if (expired) {
      item.disabledReason = 'EXPIRED'
    } else if (noStock) {
      item.disabledReason = 'OUT_OF_STOCK'
    } else {
      item.disabledReason = null
    }
    item.updatedAt = new Date().toISOString()

    return HttpResponse.json({
      reward: { ...item, confirmedCount: item.confirmedCount ?? 0 },
    })
  }),

  // US-36: desactivar y rechazar los canjes confirmados vigentes.
  http.patch(`${API_URL}/recompensas/:id/desactivar`, async ({ request, params }) => {
    await delay(250)
    const path = new URL(request.url).pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role !== 'ADMIN') {
      return errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN')
    }

    const id = Number(params.id)
    const item = rewardSeeds.find((candidate) => candidate.id === id)
    if (!item || item.status === 'DELETED') {
      return errorResponse(404, 'No existe la recompensa.', path)
    }
    if (item.status !== 'ACTIVE' && item.status !== 'DISABLED') {
      return errorResponse(
        409,
        'La recompensa ya está inactiva.',
        path,
        'INVALID_REWARD_STATUS',
      )
    }

    const rejectedRedemptions = item.confirmedCount ?? 0
    item.status = 'INACTIVE'
    item.disabledReason = null
    item.confirmedCount = 0
    item.updatedAt = new Date().toISOString()

    return HttpResponse.json({
      reward: { ...item, confirmedCount: 0 },
      rejectedRedemptions,
    })
  }),

  // US-38: baja lógica y rechazo de canjes confirmados vigentes (§3.2.7).
  http.patch(`${API_URL}/recompensas/:id/eliminar`, async ({ request, params }) => {
    await delay(250)
    const path = new URL(request.url).pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role !== 'ADMIN') {
      return errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN')
    }

    const id = Number(params.id)
    const item = rewardSeeds.find((candidate) => candidate.id === id)
    if (!item || item.status === 'DELETED') {
      return errorResponse(404, 'No existe la recompensa.', path)
    }

    const rejectedRedemptions = rejectConfirmedRedemptionsForReward(
      item.name,
      'Recompensa eliminada',
    )
    item.status = 'DELETED'
    item.disabledReason = null
    item.confirmedCount = 0
    item.updatedAt = new Date().toISOString()

    return HttpResponse.json({ rejectedRedemptions })
  }),

  // US-39 (CA-39.1, CA-39.2 y CA-39.7): catálogo del Cliente. Solo el Cliente; Administrador y Cajero
  // reciben 403. Nunca trae Inactivas ni dadas de baja. Sin paginado.
  http.get(`${API_URL}/customers/me/recompensas`, async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const path = url.pathname
    const account = accountFromRequest(request)
    if (!account) return errorResponse(401, 'Token inválido o vencido.', path, 'UNAUTHENTICATED')
    if (account.role !== 'CUSTOMER' || account.customerId === undefined) {
      return errorResponse(403, 'No tenés permiso para realizar esta acción.', path, 'FORBIDDEN')
    }

    const filter = (url.searchParams.get('filter') ?? 'ALL') as CatalogFilter
    if (!CATALOG_FILTERS.includes(filter)) {
      return errorResponse(
        400,
        'filter must be one of the following values: ALL, MOST_REDEEMED, EXPIRING_SOON',
        path,
      )
    }

    const visible = rewardSeeds
      .filter((item) => item.status === 'ACTIVE' || item.status === 'DISABLED')
      .map(toCatalogReward)

    let items: CatalogReward[]
    if (filter === 'MOST_REDEEMED') {
      items = visible.sort((a, b) => b.usedCount - a.usedCount)
    } else if (filter === 'EXPIRING_SOON') {
      // Solo Activas que vencen en 7 días o menos, por fecha ascendente
      items = visible
        .filter(
          (item) =>
            item.status === 'ACTIVE' &&
            item.daysToExpire !== null &&
            item.daysToExpire >= 0 &&
            item.daysToExpire <= 7,
        )
        .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''))
    } else {
      // Por puntos de menor a mayor y, a igual puntos, por nombre
      items = visible.sort((a, b) => a.points - b.points || a.name.localeCompare(b.name))
    }

    return HttpResponse.json({ balance: myBalanceOf(account.customerId), items })
  }),
]
