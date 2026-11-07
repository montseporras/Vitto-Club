// Tipos de canjes, iguales al contrato del Sprint 4 (§2.3, §2.4, §2.6 y §3.6.2).
import type { DocumentType } from '@/domain/documents'

/** Estado del canje (§2.3). */
export type RedemptionStatus =
  | 'CONFIRMED'
  | 'USED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'

/** Filtro "Estado" de Mis canjes (§2.6): sin valor = Todos. */
export type RedemptionStatusGroup = 'CONFIRMED' | 'FINISHED'

/** Quién lo confirmó (§2.4): la app o la caja. */
export type RedemptionOrigin = 'APP' | 'COUNTER'

// Snapshot del nombre y de los puntos al confirmar
type RedemptionReward = { id: number; name: string; points: number }

// Lo que ve el Cliente de un canje (§3.6.2, columna "Lo ve el Cliente")
type RedemptionCommon = {
  id: number
  code: string
  createdAt: string
  expiresAt: string
  status: RedemptionStatus
  reward: RedemptionReward
  resolvedAt: string | null
  rejectionReason: string | null
}

/** Canje de `GET /customers/me/canjes`: sin datos de empleados ni saldos. */
export type MyRedemption = RedemptionCommon & { canCancel: boolean }

/** Canje completo (`GET /canjes` y `GET /customers/:id/canjes`). */
export type Redemption = RedemptionCommon & {
  customer: {
    id: number
    firstName: string
    lastName: string
    documentType: DocumentType
    documentNumber: string
  }
  origin: RedemptionOrigin
  confirmedBy: { accountId: number; name: string } | null
  resolvedBy: {
    actorType: 'EMPLOYEE' | 'SYSTEM'
    accountId: number | null
    name: string
  } | null
  balanceBefore: number | null
  balanceAfter: number | null
}

/**
 * Canje recién confirmado (`201 { redemption }`, §3.7.1). Lo que usan las pantallas de las dos
 * rutas: la del Cliente no trae datos de empleados ni de otro cliente.
 */
export type ConfirmedRedemption = Pick<
  MyRedemption,
  'id' | 'code' | 'createdAt' | 'expiresAt' | 'status' | 'reward'
>

export type Paginated<TItem> = {
  items: TItem[]
  total: number
  page: number
  limit: number
}

/** Query de `GET /customers/me/canjes` (§3.12.1). Las fechas son 'YYYY-MM-DD'. */
export type MyRedemptionFilters = {
  status?: RedemptionStatusGroup
  fromDate?: string
  toDate?: string
  order?: 'asc' | 'desc'
}

/** Query de `GET /canjes` (§3.12.3). */
export type RedemptionFilters = {
  documentType?: DocumentType
  documentNumber?: string
  code?: string
  rewardName?: string
  status?: RedemptionStatus
  fromDate?: string
  toDate?: string
  order?: 'asc' | 'desc'
}

/** Body de `PATCH /canjes/:code/rechazar` (§3.10.1): el motivo, de 5 a 500 caracteres. */
export type RejectRedemptionBody = { reason: string }

/** Respuesta `200` de `PATCH /canjes/:code/rechazar` (§3.10.1). */
export type RejectRedemptionResult = { redemption: Redemption }

/** Respuesta `200` de `PATCH /customers/me/canjes/:code/cancelar` (§3.10.3): la vista del Cliente. */
export type CancelRedemptionResult = { redemption: MyRedemption }

/** Respuesta `200` de `PATCH /canjes/:code/usar` (§3.9.1). */
export type RegisterUseResult = {
  redemption: Redemption
  balanceBefore: number
  balanceAfter: number
}
