import type { DocumentType } from '@/domain/documents'
import type { Level } from '@/domain/levels'
import type { ConsumptionStatus } from '@/domain/statuses'

/** Consumo tal como lo devuelve la API (contrato §3.3.3). */
export type Consumption = {
  id: number
  /** `C-000141`, lo deriva el backend */
  code: string
  /** ISO 8601 UTC */
  createdAt: string
  customer: {
    id: number
    firstName: string
    lastName: string
    documentType: DocumentType
    documentNumber: string
  }
  amount: number
  points: number
  bonusPoints: number
  totalPoints: number
  equivalence: {
    baseAmount: number
    pointsAwarded: number
    configurationVersion: number
  }
  notes: string | null
  status: ConsumptionStatus
  registeredBy: { accountId: number; name: string }
  voidedAt: string | null
  voidedBy: { accountId: number; name: string } | null
  voidReason: string | null
  voidableUntil: string | null
  /** Calculado por el backend para quien consulta */
  canVoid: boolean
}

/** Respuesta de GET /api/consumos/preview (contrato §3.1.2). */
export type ConsumptionPreview = {
  customerId: number
  amount: number
  points: number
  bonusPoints: number
  totalPoints: number
  isFirstConsumption: boolean
  balanceBefore: number
  balanceAfter: number
  equivalence: {
    baseAmount: number
    pointsAwarded: number
    configurationVersion: number
  }
  firstConsumptionBonus: {
    bonusType: 'PERCENTAGE' | 'FIXED_AMOUNT'
    bonusValue: number
  } | null
}

/** Body de POST /api/consumos (contrato §3.1.3). Fecha, puntos y cajero los pone el servidor. */
export type CreateConsumptionBody = {
  customerId: number
  amount: number
  notes: string | null
}

/** Respuesta 201 de POST /api/consumos (contrato §3.1.3). */
export type CreateConsumptionResult = {
  consumption: Consumption
  balanceBefore: number
  balanceAfter: number
  levelBefore: Level
  levelAfter: Level
  levelUp: boolean
}

/** Respuesta de GET /api/customers/:id/consumos (contrato §3.2.1). */
export type ConsumptionsPage = {
  items: Consumption[]
  total: number
  page: number
  limit: number
}

/** Body de PATCH /api/consumos/:code/anular (contrato §3.2.2). */
export type VoidConsumptionBody = {
  reason: string
}

/** Respuesta 200 de PATCH /api/consumos/:code/anular (contrato §3.2.2). */
export type VoidConsumptionResponse = {
  consumption: Consumption
  balanceBefore: number
  balanceAfter: number
  negativeBalance: boolean
}
