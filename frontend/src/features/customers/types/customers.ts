import type { DocumentType } from '@/domain/documents'
import type { Level } from '@/domain/levels'
import type { ConsumptionStatus } from '@/domain/statuses'
import type { Customer } from '@/features/cashier'

/** Ítem de GET /api/customers: el cliente más su saldo y nivel (contrato §3.8.1). */
export type CustomerListItem = Customer & {
  /** Puede ser negativo */
  balance: number
  lifetimePoints: number
  level: Level
}

/**
 * Filtros de la pantalla Clientes. `active=true` y `sort=lastName` van siempre (§3.8.1). La
 * pantalla busca por tipo y número de documento; ya no usa `q` (contrato del Sprint 4, §3.13.4).
 */
export type CustomerListFilters = {
  documentType: DocumentType
  documentNumber: string
  level: Level | ''
  page: number
}

/**
 * Body de PATCH /api/customers/:id desde Clientes del Administrador (§3.8.2). Viaja solo lo
 * que cambió, más el motivo (obligatorio para el Administrador). El documento no se edita.
 */
export type UpdateCustomerAdminBody = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string | null
  reason: string
}

/** Tipo Consumption (contrato §3.3.3). */
export type Consumption = {
  id: number
  code: string
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
  equivalence: { baseAmount: number; pointsAwarded: number; configurationVersion: number }
  notes: string | null
  status: ConsumptionStatus
  registeredBy: { accountId: number; name: string }
  voidedAt: string | null
  voidedBy: { accountId: number; name: string } | null
  voidReason: string | null
  voidableUntil: string | null
  canVoid: boolean
}
