// Forma de la respuesta de GET /customers/me/puntos (contrato §3.10.1, igual a §3.4.1). La usan
// la llamada de my-account.api.ts, los componentes del Inicio y el mock de MSW.
import type { Level } from '@/domain/levels'

export type CustomerLevel = {
  current: Level
  /** null cuando el cliente ya está en Oro. */
  next: Level | null
  currentMinPoints: number
  /** El contrato no muestra este campo en Oro; se toma null como `next`. */
  nextMinPoints: number | null
  /** 0 en Oro. */
  pointsToNext: number
  /** Entero de 0 a 100; 100 en Oro. */
  progressPercent: number
  /** Texto informativo del nivel actual (NIV-BEN, S5 §3.10); null si no tiene. */
  benefit: string | null
  /** Texto informativo del nivel siguiente; null si no tiene o ya está en Oro. */
  nextBenefit: string | null
}

export type PointsExpiration = {
  points: number
  /** 'YYYY-MM-DD', hora de Argentina. */
  expiresAt: string
}

export type CustomerPoints = {
  customerId: number
  /** Puede ser negativo (deuda por una anulación). */
  balance: number
  negativeBalance: boolean
  /** Puntos acumulados: definen el nivel. */
  lifetimePoints: number
  level: CustomerLevel
  /** Como máximo 5, ordenados por vencimiento. Vacío si no hay ninguno. */
  nextExpirations: PointsExpiration[]
}
