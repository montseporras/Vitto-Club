import type { DocumentType } from '@/domain/documents'

export type PointsMovementType =
  | 'CONSUMPTION_CREDIT'
  | 'VOID_REVERSAL'
  | 'MANUAL_ADJUSTMENT'
  | 'EXPIRATION'
  | 'REDEMPTION'

export type PointsLotStatus = 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'VOIDED'

export type PointsMovementCustomer = {
  id: number
  firstName: string
  lastName: string
  documentType: DocumentType
  documentNumber: string
}

export type PointsMovementLot = {
  id: number
  accreditedAt: string
  expiresAt: string
  status: PointsLotStatus
}

export type PointsMovementActor = {
  actorType: 'EMPLOYEE' | 'SYSTEM'
  accountId: number | null
  name: string
}

export type PointsMovement = {
  id: number
  createdAt: string
  customer: PointsMovementCustomer
  type: PointsMovementType
  points: number
  balanceAfter: number
  description: string
  consumptionCode: string | null
  reason: string | null
  lot: PointsMovementLot | null
  performedBy: PointsMovementActor
}

export type CustomerPointsMovement = Omit<
  PointsMovement,
  'customer' | 'performedBy'
>

export type PointsMovementPage<TMovement> = {
  items: TMovement[]
  total: number
  page: number
  limit: number
}

export type PointsMovementFilters = {
  q?: string
  fromDate?: string
  toDate?: string
  type?: PointsMovementType
}
