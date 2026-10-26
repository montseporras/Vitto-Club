export { AuditPage } from './pages/AuditPage'
// US-23: el filtro "Cajero" de Consumos usa las mismas opciones que "Realizado por" (§3.3.1)
export { useAuditActors } from './api/audit.queries'
export { AUDIT_ACTIONS_BY_MODULE } from './types/audit'
export type {
  AuditAction,
  AuditActor,
  AuditActorType,
  AuditDetail,
  AuditEntry,
  AuditModule,
  AuditQueryParams,
  AuditResponse,
} from './types/audit'
