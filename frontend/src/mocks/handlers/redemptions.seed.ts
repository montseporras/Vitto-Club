import type { RedemptionStatus } from '@/features/redemptions'

export const REDEMPTION_DURATION = 15 * 60_000

export type Seed = {
  id: number
  code: string
  customerId: number
  rewardName: string
  points: number
  status: RedemptionStatus
  createdAt: number
  origin?: 'APP' | 'COUNTER'
  // Empleado que lo confirmó en la caja (los de ejemplo usan EMPLOYEE)
  confirmedBy?: { accountId: number; name: string }
  reason?: string
  // Recompensa de la que salió (los de ejemplo se buscan por nombre)
  rewardId?: number
  // Lo que deja registrar el uso (US-42) o el rechazo (US-43): el empleado y la hora. Al cancelar
  // (US-43) solo se guarda la hora: el Cliente nunca queda como quien lo resolvió.
  usedBy?: { accountId: number; name: string }
  usedAt?: number
  systemRejected?: boolean
  balanceBefore?: number
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const now = Date.now()

// Para ver el estado vacío ("Todavía no tenés canjes."), vaciar los canjes de la cuenta del Cliente.
// Las cuentas demo: Lucía (cliente 1), Martín (cliente 2). Sofía (cliente 4) tiene pasaporte.
export const redemptionSeeds: Seed[] = [
  // Confirmados: uno con mucho tiempo y uno que vence enseguida (para ver la cuenta llegar a 0)
  { id: 1, code: 'K7MP2X', customerId: 1, rewardName: 'Café con medialuna', points: 150, status: 'CONFIRMED', createdAt: now - 1 * MINUTE },
  { id: 2, code: 'Q4TN8B', customerId: 1, rewardName: 'Porción de torta', points: 300, status: 'CONFIRMED', createdAt: now - 13.5 * MINUTE, origin: 'COUNTER' },
  { id: 3, code: 'H9ZW3D', customerId: 4, rewardName: 'Café con medialuna', points: 150, status: 'CONFIRMED', createdAt: now - 6 * MINUTE },
  // Para probar los errores de registrar uso: Martín tiene saldo negativo (INSUFFICIENT_BALANCE) y
  // la recompensa de Sofía está agotada (REWARD_NOT_AVAILABLE)
  { id: 19, code: 'S5NB7X', customerId: 2, rewardName: 'Sandwich de miga', points: 200, status: 'CONFIRMED', createdAt: now - 2 * MINUTE },
  { id: 20, code: 'J8UC3V', customerId: 4, rewardName: 'Jugo exprimido', points: 250, status: 'CONFIRMED', createdAt: now - 3 * MINUTE },
  // Para rechazar y cancelar (US-43) sin gastar los de arriba: otro Confirmado de Lucía
  { id: 21, code: 'B6RW4Y', customerId: 1, rewardName: 'Porción de torta', points: 300, status: 'CONFIRMED', createdAt: now - 4 * MINUTE },
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

export function rejectConfirmedRedemptionsForReward(rewardName: string, reason: string) {
  const now = Date.now()
  let rejectedRedemptions = 0
  for (const seed of redemptionSeeds) {
    const expiresAt = seed.createdAt + REDEMPTION_DURATION
    if (
      seed.rewardName !== rewardName ||
      seed.status !== 'CONFIRMED' ||
      expiresAt <= now
    ) {
      continue
    }

    seed.status = 'REJECTED'
    seed.reason = reason
    seed.usedAt = now
    seed.systemRejected = true
    rejectedRedemptions += 1
  }
  return rejectedRedemptions
}
