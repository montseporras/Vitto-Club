// Mocks de recompensas: GET /recompensas/disponibles (mostrador, US-40, contrato del Sprint 4
// §3.5.2). Las recompensas de ejemplo las comparte la confirmación de canjes
// (redemptions.handlers.ts) y las va a usar el catálogo del Cliente (US-39).
import { delay, http, HttpResponse } from 'msw'
import type { Reward } from '@/features/rewards'
import { API_URL } from '@/shared/api/http'
import { accountFromRequest } from './auth.handlers'
import { errorResponse } from './cashier.handlers'

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
]

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
]
