// Tipos de recompensas, iguales al contrato del Sprint 4 (§2.1, §2.2 y §3.1).

/** Estado de la recompensa (§2.1). */
export type RewardStatus = 'ACTIVE' | 'DISABLED' | 'INACTIVE' | 'DELETED'

/** Motivo por el que el Sistema deshabilitó la recompensa (§2.2). */
export type RewardDisabledReason = 'OUT_OF_STOCK' | 'EXPIRED'

/** Recompensa (§3.1). */
export type Reward = {
  id: number
  name: string
  description: string | null
  /** Puntos que cuesta. Los canjes ya confirmados conservan los suyos (snapshot) */
  points: number
  /** `null` = sin límite */
  stock: number | null
  /** 'YYYY-MM-DD' en hora de Argentina; `null` = no vence */
  expiresAt: string | null
  /** `expiresAt − hoy`; `null` si no vence; negativo si ya venció */
  daysToExpire: number | null
  status: RewardStatus
  disabledReason: RewardDisabledReason | null
  /** Siempre `null` en el Sprint 4: todas usan la imagen genérica */
  photoUrl: string | null
  usedCount: number
  /** Solo en las respuestas del Administrador */
  confirmedCount?: number
  updatedAt: string
}

/** Recompensa del listado del Administrador (§3.2.1). */
export type AdminReward = Omit<Reward, 'status' | 'confirmedCount'> & {
  status: RewardListStatus
  confirmedCount: number
}

export type RewardListStatus = Exclude<RewardStatus, 'DELETED'>

export type RewardListFilters = {
  q: string
  status: RewardListStatus | ''
  page: number
}

/** Body de alta de una recompensa (§3.2.3). */
export type CreateRewardBody = {
  name: string
  description: string | null
  points: number
  stock: number | null
  expiresAt: string | null
}

/** Body de edición de una recompensa (§3.2.4). */
export type UpdateRewardBody = Partial<CreateRewardBody>

/** Respuesta de edición de una recompensa (§3.2.4). */
export type UpdateRewardResponse = {
  reward: Reward
  availabilityChange: 'ENABLED' | 'DISABLED' | null
}

/** Botones de filtro del catálogo del Cliente (§2.5). Sin valor = `ALL`. */
export type CatalogFilter = 'ALL' | 'MOST_REDEEMED' | 'EXPIRING_SOON'

/**
 * Recompensa del catálogo del Cliente (§3.5.1): la respuesta de ejemplo del contrato no trae
 * `confirmedCount` (es del Administrador) ni `updatedAt`.
 */
export type CatalogReward = Omit<Reward, 'confirmedCount' | 'updatedAt'>

/** Respuesta `200` de `GET /customers/me/recompensas` (§3.5.1): saldo actual y recompensas. */
export type CustomerCatalog = {
  balance: number
  items: CatalogReward[]
}
