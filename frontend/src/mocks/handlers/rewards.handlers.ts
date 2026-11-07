// Mocks de recompensas: GET /recompensas/disponibles (mostrador, US-40, contrato del Sprint 4
// §3.5.2) y GET /customers/me/recompensas (catálogo del Cliente, US-39, §3.5.1). Las recompensas de
// ejemplo las comparte la confirmación de canjes (redemptions.handlers.ts).
import { delay, http, HttpResponse } from 'msw'
import type { CatalogFilter, CatalogReward, Reward } from '@/features/rewards'
import { API_URL } from '@/shared/api/http'
import { accountFromRequest } from './auth.handlers'
import { errorResponse } from './cashier.handlers'
import { myBalanceOf } from './my-account.handlers'

// 'YYYY-MM-DD' en hora de Argentina
const argentinaToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

const addDays = (isoDate: string, days: number) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

const today = argentinaToday()

const reward = (
  id: number,
  name: string,
  points: number,
  extra: Partial<Reward> = {},
): Reward => ({
  id,
  name,
  description: null,
  points,
  stock: null,
  expiresAt: null,
  daysToExpire: null,
  status: 'ACTIVE',
  disabledReason: null,
  photoUrl: null,
  usedCount: 0,
  updatedAt: new Date().toISOString(),
  ...extra,
})

// Para probar: la de 100 pts vence hoy; la de 250 está agotada (Deshabilitada); la de 120 está
// Inactiva y la de 500 dada de baja (no salen); la de 900 sirve para ver "no alcanza el saldo".
// Para el catálogo (US-39): la de 180 venció ayer y el proceso diario todavía no la marcó (sigue
// ACTIVE: tiene que llegar como Vencida), y la de 350 vence en 8 días (no está en "Próx. a vencer").
export const rewardSeeds: Reward[] = [
  reward(1, 'Café con medialuna', 150, {
    description: 'Café a elección con una medialuna de manteca.',
    usedCount: 31,
  }),
  reward(2, 'Porción de torta', 300, {
    description: 'Porción de torta del día.',
    stock: 10,
    expiresAt: addDays(today, 3),
    daysToExpire: 3,
    usedCount: 12,
  }),
  reward(3, 'Desayuno completo', 400, { stock: 5, usedCount: 8 }),
  reward(4, 'Sandwich de miga', 200, { description: 'Seis triples de jamón y queso.', usedCount: 20 }),
  reward(5, 'Medialunas x3', 100, {
    description: 'Tres medialunas de manteca para llevar.',
    expiresAt: today,
    daysToExpire: 0,
    usedCount: 45,
  }),
  reward(6, 'Jugo exprimido', 250, {
    status: 'DISABLED',
    disabledReason: 'OUT_OF_STOCK',
    stock: 0,
    usedCount: 3,
  }),
  reward(7, 'Té chai', 120, { status: 'INACTIVE' }),
  reward(8, 'Combo Navidad', 500, { status: 'DELETED' }),
  reward(9, 'Cena para dos', 900, { stock: 2 }),
  reward(10, 'Licuado de estación', 180, {
    description: 'Licuado de frutas de estación con leche o agua.',
    expiresAt: addDays(today, -1),
    daysToExpire: -1,
    usedCount: 6,
  }),
  reward(11, 'Tostado con jugo', 350, {
    description: 'Tostado de jamón y queso con un jugo exprimido chico.',
    expiresAt: addDays(today, 8),
    daysToExpire: 8,
    usedCount: 15,
  }),
]

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

/** Disponible (§3.1): Activa, con stock (o sin límite) y no vencida. */
export const isAvailable = (item: Reward) =>
  item.status === 'ACTIVE' &&
  (item.stock === null || item.stock > 0) &&
  (item.expiresAt === null || item.expiresAt >= argentinaToday())

export const rewardsHandlers = [
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
