import type { DocumentType } from '@/domain/documents'

export type AuditActorType = 'EMPLOYEE' | 'SYSTEM'

export type AuditModule =
  | 'EMPLOYEES'
  | 'CUSTOMERS'
  | 'CONSUMPTIONS'
  | 'POINTS'
  | 'REDEMPTIONS'
  | 'REWARDS'
  | 'MISSIONS'
  | 'CONFIGURATION'

export type AuditAction =
  | 'EMPLOYEE_CREATED'
  | 'EMPLOYEE_UPDATED'
  | 'EMPLOYEE_DEACTIVATED'
  | 'USER_ACCOUNT_CREATED'
  | 'USER_ACCOUNT_UPDATED'
  | 'USER_ACCOUNT_DEACTIVATED'
  | 'USER_ACCOUNT_REACTIVATED'
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED'
  | 'CUSTOMER_DEACTIVATED'
  | 'CONSUMPTION_REGISTERED'
  | 'CONSUMPTION_VOIDED'
  | 'POINTS_ADJUSTED'
  | 'POINTS_EXPIRED'
  | 'REDEMPTION_CONFIRMED'
  | 'REDEMPTION_USED'
  | 'REDEMPTION_REJECTED'
  | 'REDEMPTION_EXPIRED'
  | 'REWARD_CREATED'
  | 'REWARD_UPDATED'
  | 'REWARD_ACTIVATED'
  | 'REWARD_DEACTIVATED'
  | 'REWARD_DELETED'
  | 'REWARD_DISABLED'
  | 'REWARD_ENABLED'
  | 'MISSION_CREATED'
  | 'MISSION_UPDATED'
  | 'MISSION_DELETED'
  | 'MISSION_COMPLETED'
  | 'MISSION_REWARD_CLAIMED'
  | 'MISSIONS_EXPIRED'
  | 'POINTS_EQUIVALENCE_UPDATED'
  | 'POINTS_VALIDITY_UPDATED'
  | 'FIRST_CONSUMPTION_BONUS_UPDATED'
  | 'LEVELS_UPDATED'
  | 'LOGO_AND_MESSAGES_UPDATED'
  | 'PROMOTIONS_UPDATED'

export type AuditDetail = {
  label: string
  value: string
}

export type AffectedCustomer = {
  customerId: number
  name: string
  documentType: DocumentType
  documentNumber: string
}

export type AuditEntry = {
  id: number
  createdAt: string
  actorType: AuditActorType
  actorAccountId: number | null
  performedBy: string
  module: AuditModule
  action: AuditAction
  description: string
  affectedCustomer: AffectedCustomer | null
  operationCode: string | null
  details: AuditDetail[]
}

export type AuditResponse = {
  items: AuditEntry[]
  total: number
  page: number
  limit: number
}

export type AuditActor = {
  accountId: number
  name: string
  role: 'ADMIN' | 'CASHIER'
  active: boolean
}

export type AuditQueryParams = {
  actor?: 'SYSTEM' | number
  module?: AuditModule
  action?: AuditAction
  documentType?: DocumentType
  documentNumber?: string
  fromDate?: string
  toDate?: string
  date?: string
  operationCode?: string
  page: number
  limit: 10
}

export const AUDIT_MODULES: {
  value: AuditModule
  label: string
  disabled?: boolean
}[] = [
  { value: 'EMPLOYEES', label: 'Empleados' },
  { value: 'CUSTOMERS', label: 'Clientes' },
  { value: 'CONSUMPTIONS', label: 'Consumos' },
  { value: 'POINTS', label: 'Puntos' },
  { value: 'REDEMPTIONS', label: 'Canjes' },
  { value: 'REWARDS', label: 'Recompensas (Próximamente)', disabled: true },
  { value: 'MISSIONS', label: 'Misiones (Próximamente)', disabled: true },
  { value: 'CONFIGURATION', label: 'Configuración' },
]

export const AUDIT_ACTIONS_BY_MODULE: Record<
  AuditModule,
  { value: AuditAction; label: string }[]
> = {
  EMPLOYEES: [
    { value: 'EMPLOYEE_CREATED', label: 'Registró empleado' },
    { value: 'EMPLOYEE_UPDATED', label: 'Editó empleado' },
    { value: 'EMPLOYEE_DEACTIVATED', label: 'Dio de baja empleado' },
    { value: 'USER_ACCOUNT_CREATED', label: 'Creó cuenta de usuario' },
    { value: 'USER_ACCOUNT_UPDATED', label: 'Editó cuenta de usuario' },
    { value: 'USER_ACCOUNT_DEACTIVATED', label: 'Dio de baja cuenta de usuario' },
    { value: 'USER_ACCOUNT_REACTIVATED', label: 'Reactivó cuenta de usuario' },
  ],
  CUSTOMERS: [
    { value: 'CUSTOMER_CREATED', label: 'Registró cliente' },
    { value: 'CUSTOMER_UPDATED', label: 'Editó cliente' },
    { value: 'CUSTOMER_DEACTIVATED', label: 'Dio de baja cliente' },
  ],
  CONSUMPTIONS: [
    { value: 'CONSUMPTION_REGISTERED', label: 'Registró consumo' },
    { value: 'CONSUMPTION_VOIDED', label: 'Anuló consumo' },
  ],
  POINTS: [
    { value: 'POINTS_ADJUSTED', label: 'Ajustó puntos' },
    { value: 'POINTS_EXPIRED', label: 'Venció puntos' },
  ],
  REDEMPTIONS: [
    { value: 'REDEMPTION_CONFIRMED', label: 'Confirmó canje' },
    { value: 'REDEMPTION_USED', label: 'Registró uso de canje' },
    { value: 'REDEMPTION_REJECTED', label: 'Rechazó canje' },
    { value: 'REDEMPTION_EXPIRED', label: 'Venció canje' },
  ],
  REWARDS: [
    { value: 'REWARD_CREATED', label: 'Creó recompensa' },
    { value: 'REWARD_UPDATED', label: 'Editó recompensa' },
    { value: 'REWARD_ACTIVATED', label: 'Activó recompensa' },
    { value: 'REWARD_DEACTIVATED', label: 'Desactivó recompensa' },
    { value: 'REWARD_DELETED', label: 'Dio de baja recompensa' },
    { value: 'REWARD_DISABLED', label: 'Deshabilitó recompensa' },
    { value: 'REWARD_ENABLED', label: 'Habilitó recompensa' },
  ],
  MISSIONS: [
    { value: 'MISSION_CREATED', label: 'Creó misión' },
    { value: 'MISSION_UPDATED', label: 'Editó misión' },
    { value: 'MISSION_DELETED', label: 'Dio de baja misión' },
    { value: 'MISSION_COMPLETED', label: 'Completó misión' },
    { value: 'MISSION_REWARD_CLAIMED', label: 'Reclamó recompensa de misión' },
    { value: 'MISSIONS_EXPIRED', label: 'Venció misiones del mes' },
  ],
  CONFIGURATION: [
    { value: 'POINTS_EQUIVALENCE_UPDATED', label: 'Modificó equivalencia de puntos' },
    { value: 'POINTS_VALIDITY_UPDATED', label: 'Modificó vigencia de puntos' },
    {
      value: 'FIRST_CONSUMPTION_BONUS_UPDATED',
      label: 'Modificó bonificación por primer consumo',
    },
    { value: 'LEVELS_UPDATED', label: 'Modificó niveles' },
    { value: 'LOGO_AND_MESSAGES_UPDATED', label: 'Modificó logo y mensajes' },
    { value: 'PROMOTIONS_UPDATED', label: 'Modificó promociones' },
  ],
}
