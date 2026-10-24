import type { DocumentType } from '@/domain/documents'
import type { Level } from '@/domain/levels'
import type { PointsMovementType } from '@/domain/statuses'

/** Respuesta de GET /api/customers/:id/puntos (contrato §3.4.1). */
export type CustomerPoints = {
  customerId: number
  /** Puede ser negativo (deuda por anulaciones) */
  balance: number
  negativeBalance: boolean
  lifetimePoints: number
  level: {
    current: Level
    next: Level | null
    currentMinPoints: number
    nextMinPoints: number | null
    pointsToNext: number
    progressPercent: number
  }
  /** `expiresAt` en 'YYYY-MM-DD' (hora de Argentina) */
  nextExpirations: { points: number; expiresAt: string }[]
}

/** Tipo PointsMovement (contrato §3.6). */
export type PointsMovement = {
  id: number
  createdAt: string
  customer: {
    id: number
    firstName: string
    lastName: string
    documentType: DocumentType
    documentNumber: string
  }
  type: PointsMovementType
  /** Con signo: +500, −500 */
  points: number
  balanceAfter: number
  /** "Detalle / origen", lo arma el backend */
  description: string
  consumptionCode: string | null
  reason: string | null
  lot: {
    id: number
    accreditedAt: string
    expiresAt: string
    status: 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'VOIDED'
  } | null
  performedBy: {
    actorType: 'EMPLOYEE' | 'SYSTEM'
    accountId: number | null
    name: string
  }
}
