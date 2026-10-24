import { Injectable } from '@nestjs/common';
import { assertValidAuditEntry, type AuditEntryInput } from '../domain/audit-entry.js';
import { AuditRepository } from '../domain/port/audit.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';

@Injectable()
export class AuditService {
  constructor(
    private readonly repository: AuditRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  // Ejecuta `operation` y escribe la auditoría en la MISMA transacción (contrato §3.9.1, regla 7).
  // `buildEntry` recibe el resultado de la operación para armar la entrada (ya con los datos
  // finales: ids, nombres, saldos). Puede devolver una entrada, varias (el guardado completo de
  // la configuración registra una por sección) o null si no hay nada que auditar.
  // Si una entrada es inválida o la escritura falla, se deshace también la operación.
  async capture<T>(
    operation: () => Promise<T>,
    buildEntry: (result: T) => AuditEntryInput | AuditEntryInput[] | null,
  ): Promise<T> {
    return await this.transactionRunner.run(async () => {
      const result = await operation();
      const built = buildEntry(result);
      const entries = built === null ? [] : Array.isArray(built) ? built : [built];
      for (const entry of entries) {
        await this.record(entry);
      }
      return result;
    });
  }

  // Escribe una entrada en la transacción en curso (para los procesos del Sistema que ya
  // abrieron la suya, como el vencimiento de puntos).
  async record(entry: AuditEntryInput): Promise<void> {
    assertValidAuditEntry(entry);
    await this.repository.record(entry);
  }
}
