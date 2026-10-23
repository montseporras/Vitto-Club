import type { AuditService } from '../application/audit.service.js';
import { assertValidAuditEntry, type AuditEntryInput } from '../domain/audit-entry.js';

// Doble de AuditService para los tests de controllers: ejecuta la operación, arma las entradas y
// las valida como el servicio real, y las deja en `entries` para que el test las compruebe.
export function createCapturingAuditService(): {
  service: AuditService;
  entries: AuditEntryInput[];
} {
  const entries: AuditEntryInput[] = [];
  const service = {
    capture: async <T>(
      operation: () => Promise<T>,
      buildEntry: (result: T) => AuditEntryInput | AuditEntryInput[] | null,
    ): Promise<T> => {
      const result = await operation();
      const built = buildEntry(result);
      for (const entry of built === null ? [] : Array.isArray(built) ? built : [built]) {
        assertValidAuditEntry(entry);
        entries.push(entry);
      }
      return result;
    },
  } as unknown as AuditService;
  return { service, entries };
}
