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
