import type { AuditEntryInput } from '../audit-entry.js';
import type { AuditActorOption, AuditFilters } from '../audit-filters.js';
import type { AuditPage } from '../audit-record.js';

export abstract class AuditRepository {
  // Inserta la entrada en la transacción en curso. Resuelve el nombre del empleado (foto).
  abstract record(entry: AuditEntryInput): Promise<void>;

  // Página del historial: fecha descendente y, a igual fecha, id descendente. Nunca trae las
  // filas sin módulo (las viejas de sesión y autorregistro).
  abstract find(filters: AuditFilters): Promise<AuditPage>;

  // Cuentas de empleados, activas e inactivas, por apellido (opciones del filtro "Realizado por")
  abstract findActors(): Promise<AuditActorOption[]>;
}
