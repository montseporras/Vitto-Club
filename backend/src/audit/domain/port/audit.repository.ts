import type { AuditEntryInput } from '../audit-entry.js';

export abstract class AuditRepository {
  // Inserta la entrada en la transacción en curso. Resuelve el nombre del empleado (foto).
  abstract record(entry: AuditEntryInput): Promise<void>;
}
