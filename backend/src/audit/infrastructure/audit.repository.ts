import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import type { AuditDetail, AuditEntryInput } from '../domain/audit-entry.js';
import type { AuditActorOption, AuditFilters } from '../domain/audit-filters.js';
import type { AuditPage, AuditRecord } from '../domain/audit-record.js';
import { InvalidAuditEntryError } from '../domain/errors/invalid-audit-entry.error.js';
import { AuditRepository } from '../domain/port/audit.repository.js';

const SYSTEM_NAME = 'Sistema';

// El listado nunca muestra las filas sin módulo (las viejas de sesión y autorregistro, §3.9.6)
function buildWhere(filters: AuditFilters): Prisma.AuditLogWhereInput {
  const { actor, createdFrom, createdBefore } = filters;
  return {
    module: filters.module ?? { not: null },
    ...(filters.action ? { actionCode: filters.action } : {}),
    ...(actor?.type === 'SYSTEM' ? { actorType: 'SYSTEM' as const } : {}),
    ...(actor?.type === 'EMPLOYEE'
      ? { actorType: 'EMPLOYEE' as const, actorAccountId: actor.accountId }
      : {}),
    ...(filters.documentType ? { documentType: filters.documentType } : {}),
    ...(filters.documentNumber
      ? { documentNumber: { contains: filters.documentNumber, mode: 'insensitive' as const } }
      : {}),
    ...(createdFrom || createdBefore
      ? { createdAt: { ...(createdFrom ? { gte: createdFrom } : {}), ...(createdBefore ? { lt: createdBefore } : {}) } }
      : {}),
    ...(filters.operationCode
      ? { operationCode: { equals: filters.operationCode, mode: 'insensitive' as const } }
      : {}),
  };
}

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

  async find(filters: AuditFilters): Promise<AuditPage> {
    const where = buildWhere(filters);
    const [rows, total] = await Promise.all([
      this.tx.client.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.tx.client.auditLog.count({ where }),
    ]);

    const items: AuditRecord[] = rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      actorType: row.actorType,
      actorAccountId: row.actorAccountId,
      performedBy: row.performedBy,
      // El filtro `module: { not: null }` garantiza que estos tres campos vienen completos
      module: row.module as NonNullable<typeof row.module>,
      action: row.actionCode as NonNullable<typeof row.actionCode>,
      description: row.description as string,
      affectedCustomer:
        row.affectedCustomerId !== null && row.documentType !== null && row.documentNumber !== null
          ? {
              customerId: row.affectedCustomerId,
              name: row.affectedCustomerName ?? '',
              documentType: row.documentType,
              documentNumber: row.documentNumber,
            }
          : null,
      operationCode: row.operationCode,
      details: row.details as AuditDetail[],
    }));
    return { items, total };
  }

  async findActors(): Promise<AuditActorOption[]> {
    // Solo cuentas de empleados, activas e inactivas: una persona dada de baja puede tener
    // registros viejos
    const accounts = await this.tx.client.account.findMany({
      where: { employeeId: { not: null } },
      select: {
        id: true,
        role: true,
        isActive: true,
        employee: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ employee: { lastName: 'asc' } }, { employee: { firstName: 'asc' } }, { id: 'asc' }],
    });
    return accounts.flatMap((account) =>
      account.employee && account.role !== 'CUSTOMER'
        ? [
            {
              accountId: account.id,
              name: `${account.employee.firstName} ${account.employee.lastName}`,
              role: account.role,
              active: account.isActive,
            },
          ]
        : [],
    );
  }
}
