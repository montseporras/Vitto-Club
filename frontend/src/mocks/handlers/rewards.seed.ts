import type { Reward } from '@/features/rewards'

// 'YYYY-MM-DD' en hora de Argentina
export const argentinaToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

const addDays = (isoDate: string, days: number) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

const today = argentinaToday()

export const reward = (
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
// Inactiva y sin stock; la de 80 está Inactiva y vencida; la de 500 dada de baja (no salen); la de
// 900 sirve para ver "no alcanza el saldo".
// Para el catálogo (US-39): la de 180 venció ayer y el proceso diario todavía no la marcó (sigue
// ACTIVE: tiene que llegar como Vencida), y la de 350 vence en 8 días (no está en "Próx. a vencer").
export const rewardSeeds: Reward[] = [
  reward(1, 'Café con medialuna', 150, {
    description: 'Café a elección con una medialuna de manteca.',
    confirmedCount: 2,
    usedCount: 31,
  }),
  reward(2, 'Porción de torta', 300, {
    description: 'Porción de torta del día.',
    stock: 10,
    expiresAt: addDays(today, 3),
    daysToExpire: 3,
    confirmedCount: 2,
    usedCount: 12,
  }),
  reward(3, 'Desayuno completo', 400, { stock: 5, usedCount: 8 }),
  reward(4, 'Sandwich de miga', 200, {
    description: 'Seis triples de jamón y queso.',
    confirmedCount: 1,
    usedCount: 20,
  }),
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
    confirmedCount: 1,
    usedCount: 3,
  }),
  reward(7, 'Té chai', 120, { status: 'INACTIVE', stock: 0 }),
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
  reward(12, 'Tisana de estación', 80, {
    status: 'INACTIVE',
    stock: 0,
    expiresAt: addDays(today, -1),
    daysToExpire: -1,
  }),
]

/** Disponible (§3.1): Activa, con stock (o sin límite) y no vencida. */
export const isAvailable = (item: Reward) =>
  item.status === 'ACTIVE' &&
  (item.stock === null || item.stock > 0) &&
  (item.expiresAt === null || item.expiresAt >= argentinaToday())
