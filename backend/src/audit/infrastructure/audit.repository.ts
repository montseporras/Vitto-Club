import { Injectable } from '@nestjs/common';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import type { AuditEntryInput } from '../domain/audit-entry.js';
import { InvalidAuditEntryError } from '../domain/errors/invalid-audit-entry.error.js';
import { AuditRepository } from '../domain/port/audit.repository.js';

const SYSTEM_NAME = 'Sistema';

@Injectable()
export class AuditPrismaRepository extends AuditRepository {
  constructor(private readonly tx: PrismaTransactionRunner) {
    super();
  }

  async record(entry: AuditEntryInput): Promise<void> {
    const { actor, affectedCustomer } = entry;

    let performedBy = SYSTEM_NAME;
    let actorAccountId: number | null = null;
    if (actor.type === 'EMPLOYEE') {
      const account = await this.tx.client.account.findUnique({
        where: { id: actor.accountId },
        select: { employee: { select: { firstName: true, lastName: true } } },
      });
      // Una cuenta sin empleado es de un cliente: nunca puede figurar como actor.
      if (!account?.employee) {
        throw new InvalidAuditEntryError(`account ${actor.accountId} is not an employee`);
      }
      performedBy = `${account.employee.firstName} ${account.employee.lastName}`;
      actorAccountId = actor.accountId;
    }

    await this.tx.client.auditLog.create({
      data: {
        actorType: actor.type,
        actorAccountId,
        performedBy,
        module: entry.module,
        actionCode: entry.action,
        description: entry.description,
        affectedCustomerId: affectedCustomer?.customerId ?? null,
        affectedCustomerName: affectedCustomer?.name ?? null,
        documentType: affectedCustomer?.documentType ?? null,
        documentNumber: affectedCustomer?.documentNumber ?? null,
        operationCode: entry.operationCode ?? null,
        details: entry.details,
      },
    });
  }
}
