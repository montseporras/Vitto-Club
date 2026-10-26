import { Injectable, NotFoundException } from '@nestjs/common';
import type { PointsLot as PrismaPointsLotRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { PointsLot } from '../domain/points-lot.js';
import {
  ActiveLoyaltyConfiguration,
  CustomerPointsBalance,
  ExpirationCustomer,
  ExpiredLotCandidate,
  InsertedMovement,
  InsertMovementData,
  PointsRepository,
} from '../domain/port/points.repository.js';

export function toDomain(record: PrismaPointsLotRecord): PointsLot {
  return PointsLot.reconstruct({
    id: record.id,
    customerId: record.customerId,
    consumptionId: record.consumptionId,
    initialPoints: record.initialPoints,
    remainingPoints: record.remainingPoints,
    accreditedAt: record.accreditedAt,
    expiresAt: record.expiresAt,
    status: record.status,
    expiredAt: record.expiredAt,
  });
}

type CustomerPointsRow = {
  customerId: number;
  balance: number;
  debt: number;
  lifetimePoints: number;
};

function toBalance(row: CustomerPointsRow): CustomerPointsBalance {
  return {
    customerId: row.customerId,
    balance: row.balance,
    debt: row.debt,
    lifetimePoints: row.lifetimePoints,
  };
}

@Injectable()
export class PointsPrismaRepository implements PointsRepository {
  // Mismo patrón que accounts/employees/customers/consumptions: inyecta
  // PrismaTransactionRunner y usa .client, para participar de la transacción ambiente.
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  // CA-BASE.10 + Opción B de P6: bloquea la fila con SELECT ... FOR UPDATE. Si todavía no
  // existe (el cliente nunca tuvo un movimiento), la crea con INSERT ... ON CONFLICT DO
  // NOTHING y vuelve a bloquear — así, si dos transacciones concurrentes intentan crearla
  // para el mismo cliente a la vez, ninguna falla y las dos terminan viendo la misma fila
  // ya bloqueada en serie.
  async lockOrCreateBalance(customerId: number): Promise<CustomerPointsBalance> {
    const existing = await this.prisma.$queryRaw<CustomerPointsRow[]>`
      SELECT customer_id AS "customerId", balance, debt, lifetime_points AS "lifetimePoints"
      FROM customer_points WHERE customer_id = ${customerId} FOR UPDATE
    `;
    if (existing.length > 0) return toBalance(existing[0]);

    await this.prisma.$executeRaw`
      INSERT INTO customer_points (customer_id, balance, debt, lifetime_points, updated_at)
      VALUES (${customerId}, 0, 0, 0, now())
      ON CONFLICT (customer_id) DO NOTHING
    `;

    const created = await this.prisma.$queryRaw<CustomerPointsRow[]>`
      SELECT customer_id AS "customerId", balance, debt, lifetime_points AS "lifetimePoints"
      FROM customer_points WHERE customer_id = ${customerId} FOR UPDATE
    `;
    return toBalance(created[0]);
  }

  async findBalance(customerId: number): Promise<CustomerPointsBalance | null> {
    const record = await this.prisma.customerPoints.findUnique({ where: { customerId } });
    return record ? toBalance(record) : null;
  }

  async updateBalance(
    customerId: number,
    data: { balance: number; debt: number; lifetimePoints: number },
  ): Promise<void> {
    await this.prisma.customerPoints.update({
      where: { customerId },
      data: { balance: data.balance, debt: data.debt, lifetimePoints: data.lifetimePoints },
    });
  }

  async findActiveLotsByCustomerId(customerId: number): Promise<PointsLot[]> {
    const records = await this.prisma.pointsLot.findMany({
      where: { customerId, status: 'ACTIVE' },
      orderBy: { expiresAt: 'asc' },
    });
    return records.map(toDomain);
  }

  async findLotByConsumptionId(consumptionId: number): Promise<PointsLot | null> {
    const record = await this.prisma.pointsLot.findUnique({ where: { consumptionId } });
    return record ? toDomain(record) : null;
  }

  async createLot(lot: PointsLot): Promise<PointsLot> {
    const created = await this.prisma.pointsLot.create({
      data: {
        customerId: lot.getCustomerId(),
        consumptionId: lot.getConsumptionId(),
        initialPoints: lot.getInitialPoints(),
        remainingPoints: lot.getRemainingPoints(),
        accreditedAt: lot.getAccreditedAt(),
        expiresAt: lot.getExpiresAt(),
        status: lot.getStatus(),
      },
    });
    return toDomain(created);
  }

  async updateLot(lot: PointsLot): Promise<void> {
    const id = lot.getId();
    if (!id) {
      throw new NotFoundException('Points lot id is required to update');
    }

    await this.prisma.pointsLot.update({
      where: { id },
      data: {
        remainingPoints: lot.getRemainingPoints(),
        status: lot.getStatus(),
        expiredAt: lot.getExpiredAt(),
      },
    });
  }

  async insertMovement(data: InsertMovementData): Promise<InsertedMovement> {
    return await this.prisma.pointsMovement.create({
      data: {
        customerId: data.customerId,
        type: data.type,
        points: data.points,
        balanceAfter: data.balanceAfter,
        consumptionId: data.consumptionId,
        lotId: data.lotId,
        reason: data.reason ?? null,
        performedByAccountId: data.performedByAccountId,
        performedByName: data.performedByName,
      },
      select: { id: true, createdAt: true },
    });
  }

  async findActiveLoyaltyConfiguration(): Promise<ActiveLoyaltyConfiguration | null> {
    const config = await this.prisma.loyaltyProgramConfiguration.findFirst({
      where: { isActive: true },
    });
    if (!config) return null;

    return {
      pointsExpirationMonths: config.pointsExpirationMonths,
      silverMinPoints: config.silverMinPoints,
      goldMinPoints: config.goldMinPoints,
    };
  }

  async findExpiredLotCandidates(now: Date): Promise<ExpiredLotCandidate[]> {
    const lots = await this.prisma.pointsLot.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: now },
        remainingPoints: { gt: 0 },
        customer: { isActive: true },
      },
      // Usa el índice (status, expires_at)
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
      select: { id: true, customerId: true },
    });
    return lots.map((lot) => ({ lotId: lot.id, customerId: lot.customerId }));
  }

  async lockLotForExpiration(lotId: number): Promise<PointsLot | null> {
    // SKIP LOCKED: si otra instancia ya tiene el lote, se saltea en vez de esperarla
    const locked = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM points_lots WHERE id = ${lotId} FOR UPDATE SKIP LOCKED
    `;
    if (locked.length === 0) return null;

    const record = await this.prisma.pointsLot.findUnique({ where: { id: lotId } });
    return record ? toDomain(record) : null;
  }

  async findExpirationCustomer(customerId: number): Promise<ExpirationCustomer> {
    return await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentType: true,
        documentNumber: true,
      },
    });
  }
}
