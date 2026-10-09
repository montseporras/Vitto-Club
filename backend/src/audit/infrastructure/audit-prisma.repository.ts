import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Prisma as PrismaClientTypes } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import {
  AuditRepository,
  type AuditCategory,
  type AuditEntry,
  type AuditFilters,
  type AuditPage,
  type RecordAuditEntry,
} from '../domain/audit.repository.js';

type AuditRow = {
  id: number;
  createdAt: Date;
  performedBy: string;
  actorAccountId: number | null;
  category: AuditCategory;
  action: string;
  documentType: AuditEntry['documentType'];
  documentNumber: string | null;
  details: Prisma.JsonValue | null;
};

function dayStart(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function dayAfter(date: string): Date {
  const result = dayStart(date);
  result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

@Injectable()
export class AuditPrismaRepository extends AuditRepository {
  constructor(private readonly tx: PrismaTransactionRunner) {
    super();
  }

  async record(entry: RecordAuditEntry): Promise<void> {
    let performedBy = entry.performedBy?.trim();
    if (entry.actorAccountId !== undefined) {
      const account = await this.tx.client.account.findUnique({
        where: { id: entry.actorAccountId },
        include: { employee: true, customer: true },
      });
      if (!account) {
        throw new Error(
          `Cannot audit operation: account ${entry.actorAccountId} was not found`,
        );
      }
      performedBy = account.employee
        ? `${account.employee.firstName} ${account.employee.lastName}`
        : account.customer
          ? `${account.customer.firstName} ${account.customer.lastName}`
          : account.email;
    }
    if (!performedBy) {
      throw new Error('Cannot audit operation without an actor identity');
    }

    const details =
      entry.details === undefined ? null : JSON.stringify(entry.details);
    await this.tx.client.$executeRaw`
      INSERT INTO audit_logs (
        performed_by,
        actor_account_id,
        category,
        action,
        document_type,
        document_number,
        details
      )
      VALUES (
        ${performedBy},
        ${entry.actorAccountId ?? null},
        ${entry.category}::"AuditCategory",
        ${entry.action},
        ${entry.documentType ?? null}::"DocumentType",
        ${entry.documentNumber ?? null},
        ${details}::jsonb
      )
    `;
  }

  async find(filters: AuditFilters): Promise<AuditPage> {
    const conditions: PrismaClientTypes.Sql[] = [];
    if (filters.date) {
      conditions.push(Prisma.sql`created_at >= ${dayStart(filters.date)}`);
      conditions.push(Prisma.sql`created_at < ${dayAfter(filters.date)}`);
    } else {
      if (filters.fromDate) {
        conditions.push(
          Prisma.sql`created_at >= ${dayStart(filters.fromDate)}`,
        );
      }
      if (filters.toDate) {
        conditions.push(
          Prisma.sql`created_at < ${dayAfter(filters.toDate)}`,
        );
      }
    }
    if (filters.performedBy) {
      conditions.push(
        Prisma.sql`LOWER(performed_by) = LOWER(${filters.performedBy.trim()})`,
      );
    }
    if (filters.category) {
      conditions.push(Prisma.sql`category = ${filters.category}::"AuditCategory"`);
    }
    if (filters.documentType) {
      conditions.push(
        Prisma.sql`document_type = ${filters.documentType}::"DocumentType"`,
      );
    }
    if (filters.documentNumber) {
      conditions.push(
        Prisma.sql`document_number = ${filters.documentNumber.trim()}`,
      );
    }
    const where = conditions.length
      ? Prisma.join(conditions, ' AND ')
      : Prisma.raw('TRUE');

    const [items, count] = await Promise.all([
      this.tx.client.$queryRaw<AuditRow[]>(Prisma.sql`
        SELECT
          id,
          created_at AS "createdAt",
          performed_by AS "performedBy",
          actor_account_id AS "actorAccountId",
          category,
          action,
          document_type AS "documentType",
          document_number AS "documentNumber",
          details
        FROM audit_logs
        WHERE ${where}
        ORDER BY created_at DESC, id DESC
        OFFSET ${(filters.page - 1) * filters.limit}
        LIMIT ${filters.limit}
      `),
      this.tx.client.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::integer AS total
        FROM audit_logs
        WHERE ${where}
      `),
    ]);
    const total = count[0]?.total ?? 0;
    return { items, total };
  }
}
