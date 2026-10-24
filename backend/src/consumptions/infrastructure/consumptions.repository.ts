import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Consumption as PrismaConsumptionRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { Consumption } from '../domain/consumption.js';
import {
  ConsumptionRepository,
  FindAllFilters,
  FindAllResult,
  FindByCustomerIdFilters,
  FindByCustomerIdResult,
} from '../domain/port/consumption.repository.js';
import type { CustomerSearch } from '../../points/domain/movement-filters.js';

// Mismas letras que foldName() del dominio de points: minúsculas con tilde → sin tilde (la ñ no
// se toca). Copiado de points-movements.repository.ts: un repositorio no importa la
// infraestructura de otro módulo (decisión de Jazmín).
const ACCENTED = 'áàäâéèëêíìïîóòöôúùüû';
const PLAIN = 'aaaaeeeeiiiioooouuuu';

// Un término buscado no puede usar los comodines de LIKE
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

const customerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  documentType: true,
  documentNumber: true,
} satisfies Prisma.CustomerSelect;

// amount/baseAmount son DECIMAL(12,2) en Prisma -> llegan como Prisma.Decimal; el dominio
// trabaja con number (igual criterio que loyalty con PointsEquivalence).
export function toDomain(record: PrismaConsumptionRecord): Consumption {
  return Consumption.reconstruct({
    id: record.id,
    customerId: record.customerId,
    amount: Number(record.amount),
    notes: record.notes,
    points: record.points,
    bonusPoints: record.bonusPoints,
    configurationVersion: record.configurationVersion,
    baseAmount: Number(record.baseAmount),
    pointsAwarded: record.pointsAwarded,
    registeredByAccountId: record.registeredByAccountId,
    registeredByName: record.registeredByName,
    status: record.status,
    createdAt: record.createdAt,
    voidedAt: record.voidedAt,
    voidedByAccountId: record.voidedByAccountId,
    voidedByName: record.voidedByName,
    voidedReason: record.voidedReason,
  });
}

@Injectable()
export class ConsumptionPrismaRepository implements ConsumptionRepository {
  // Mismo patrón que accounts/employees/customers: inyecta PrismaTransactionRunner y usa
  // .client, para participar de la transacción ambiente sin saber nada de transacciones.
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  async save(consumption: Consumption): Promise<Consumption> {
    const created = await this.prisma.consumption.create({
      data: {
        customerId: consumption.getCustomerId(),
        amount: consumption.getAmount(),
        notes: consumption.getNotes(),
        points: consumption.getPoints(),
        bonusPoints: consumption.getBonusPoints(),
        configurationVersion: consumption.getConfigurationVersion(),
        baseAmount: consumption.getBaseAmount(),
        pointsAwarded: consumption.getPointsAwarded(),
        registeredByAccountId: consumption.getRegisteredByAccountId(),
        registeredByName: consumption.getRegisteredByName(),
      },
    });
    return toDomain(created);
  }

  async findByCode(code: string): Promise<Consumption | null> {
    const id = Consumption.parseCode(code);
    if (id === null) return null;

    const record = await this.prisma.consumption.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async existsRegisteredByCustomerId(customerId: number): Promise<boolean> {
    const match = await this.prisma.consumption.findFirst({
      where: { customerId, status: 'REGISTERED' },
      select: { id: true },
    });
    return match !== null;
  }

  async updateVoidStatus(consumption: Consumption): Promise<void> {
    const id = consumption.getId();
    if (!id) {
      throw new NotFoundException('Consumption id is required to update');
    }

    await this.prisma.consumption.update({
      where: { id },
      data: {
        status: consumption.getStatus(),
        voidedAt: consumption.getVoidedAt(),
        voidedByAccountId: consumption.getVoidedByAccountId(),
        voidedByName: consumption.getVoidedByName(),
        voidedReason: consumption.getVoidedReason(),
      },
    });
  }

  // §3.2.1. last24h ya viene resuelto por el service según el rol (Cajero: siempre true).
  async findByCustomerId(
    customerId: number,
    filters: FindByCustomerIdFilters,
  ): Promise<FindByCustomerIdResult> {
    const where = {
      customerId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.last24h
        ? { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.consumption.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.consumption.count({ where }),
    ]);

    return { items: records.map(toDomain), total };
  }

  // §3.3.1. count incluye los anulados; amountTotal y pointsTotal suman solo los REGISTERED.
  async findAll(filters: FindAllFilters): Promise<FindAllResult> {
    const searchIds = filters.search ? await this.findCustomerIdsBySearch(filters.search) : undefined;
    if (searchIds && searchIds.length === 0) {
      return { items: [], total: 0, totals: { count: 0, amountTotal: 0, pointsTotal: 0 } };
    }

    const where: Prisma.ConsumptionWhereInput = {
      AND: [
        ...(filters.customerId !== undefined ? [{ customerId: filters.customerId }] : []),
        ...(searchIds ? [{ customerId: { in: searchIds } }] : []),
        ...(filters.status ? [{ status: filters.status }] : []),
        ...(filters.registeredByAccountId !== undefined
          ? [{ registeredByAccountId: filters.registeredByAccountId }]
          : []),
        ...(filters.createdFrom ? [{ createdAt: { gte: filters.createdFrom } }] : []),
        ...(filters.createdBefore ? [{ createdAt: { lt: filters.createdBefore } }] : []),
      ],
    };

    const [records, total, registeredSums] = await Promise.all([
      this.prisma.consumption.findMany({
        where,
        include: { customer: { select: customerSelect } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.consumption.count({ where }),
      this.prisma.consumption.aggregate({
        where: { AND: [where, { status: 'REGISTERED' }] },
        _sum: { amount: true, points: true, bonusPoints: true },
      }),
    ]);

    return {
      items: records.map(({ customer, ...record }) => ({ consumption: toDomain(record), customer })),
      total,
      totals: {
        count: total,
        amountTotal: Number(registeredSums._sum.amount ?? 0),
        pointsTotal: (registeredSums._sum.points ?? 0) + (registeredSums._sum.bonusPoints ?? 0),
      },
    };
  }

  // Clientes (activos o no) que coinciden con q. El nombre se compara sin tildes con
  // translate(), igual que en los movimientos de US-26.
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
