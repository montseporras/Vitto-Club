import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import type { CustomerSearch } from '../domain/movement-filters.js';
import type { PointsMovementRecord } from '../domain/points-movement.js';
import {
  MovementListFilters,
  MovementListResult,
  PointsMovementsRepository,
} from '../domain/port/points-movements.repository.js';

// Mismas letras que foldName() del dominio: minúsculas con tilde → sin tilde (la ñ no se toca)
const ACCENTED = 'áàäâéèëêíìïîóòöôúùüû';
const PLAIN = 'aaaaeeeeiiiioooouuuu';

// Un término buscado no puede usar los comodines de LIKE
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

const movementInclude = {
  customer: {
    select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true },
  },
  lot: { select: { id: true, accreditedAt: true, expiresAt: true, status: true } },
} satisfies Prisma.PointsMovementInclude;

type MovementRow = Prisma.PointsMovementGetPayload<{ include: typeof movementInclude }>;

function toRecord(row: MovementRow): PointsMovementRecord {
  return {
    id: row.id,
    createdAt: row.createdAt,
    customer: row.customer,
    type: row.type,
    points: row.points,
    balanceAfter: row.balanceAfter,
    consumptionId: row.consumptionId,
    reason: row.reason,
    lot: row.lot,
    performedByAccountId: row.performedByAccountId,
    performedByName: row.performedByName,
  };
}

@Injectable()
export class PointsMovementsPrismaRepository implements PointsMovementsRepository {
  // Mismo patrón que el resto de los repositorios: usa el client de la transacción ambiente
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  async customerExists(customerId: number): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    return customer !== null;
  }

  async list(filters: MovementListFilters): Promise<MovementListResult> {
    const searchIds = filters.search ? await this.findCustomerIdsBySearch(filters.search) : undefined;
    if (searchIds && searchIds.length === 0) {
      return { items: [], total: 0 };
    }

    const where: Prisma.PointsMovementWhereInput = {
      AND: [
        ...(filters.customerId !== undefined ? [{ customerId: filters.customerId }] : []),
        ...(searchIds ? [{ customerId: { in: searchIds } }] : []),
        ...(filters.type ? [{ type: filters.type }] : []),
        ...(filters.createdFrom ? [{ createdAt: { gte: filters.createdFrom } }] : []),
        ...(filters.createdBefore ? [{ createdAt: { lt: filters.createdBefore } }] : []),
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.pointsMovement.findMany({
        where,
        include: movementInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.pointsMovement.count({ where }),
    ]);

    return { items: rows.map(toRecord), total };
  }

  // Clientes (activos o no) que coinciden con q. El nombre se compara sin tildes con translate(),
  // sin extensiones de Postgres (decisión de Jazmín: no hay migración para esto).
  private async findCustomerIdsBySearch(search: CustomerSearch): Promise<number[]> {
    if (search.kind === 'document') {
      const customers = await this.prisma.customer.findMany({
        where: { documentNumber: { contains: search.documentNumber } },
        select: { id: true },
      });
      return customers.map((customer) => customer.id);
    }

    const conditions = search.terms.map((term) => {
      const pattern = `%${escapeLike(term)}%`;
      return Prisma.sql`(translate(lower(first_name), ${ACCENTED}, ${PLAIN}) LIKE ${pattern}
        OR translate(lower(last_name), ${ACCENTED}, ${PLAIN}) LIKE ${pattern})`;
    });
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM customers WHERE ${Prisma.join(conditions, ' AND ')}
    `;
    return rows.map((row) => row.id);
  }
}
