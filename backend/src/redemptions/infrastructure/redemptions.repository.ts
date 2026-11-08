import { Injectable } from '@nestjs/common';
import type { Prisma, Redemption as PrismaRedemptionRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { Redemption } from '../domain/redemption.js';
import {
  RedemptionRepository,
  type AutomaticRejectionFilter,
  type RedemptionCustomer,
  type RedemptionExpirationFilter,
} from '../domain/port/redemption.repository.js';

function expirationFilterWhere(filter: RedemptionExpirationFilter): Prisma.RedemptionWhereInput {
  if ('code' in filter) return { code: filter.code };
  if ('customerId' in filter) return { customerId: filter.customerId };
  if ('rewardId' in filter) return { rewardId: filter.rewardId };
  return {};
}

export function toDomain(record: PrismaRedemptionRecord): Redemption {
  return Redemption.reconstruct({
    id: record.id,
    code: record.code,
    customerId: record.customerId,
    rewardId: record.rewardId,
    rewardName: record.rewardName,
    points: record.points,
    status: record.status,
    origin: record.origin,
    confirmedByAccountId: record.confirmedByAccountId,
    confirmedByName: record.confirmedByName,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    resolvedAt: record.resolvedAt,
    resolvedByAccountId: record.resolvedByAccountId,
    resolvedByName: record.resolvedByName,
    rejectionReason: record.rejectionReason,
    balanceBefore: record.balanceBefore,
    balanceAfter: record.balanceAfter,
  });
}

@Injectable()
export class RedemptionsPrismaRepository implements RedemptionRepository {
  // Mismo patrón que los demás módulos: usa el client de PrismaTransactionRunner para
  // participar de la transacción ambiente.
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  async existsByCode(code: string): Promise<boolean> {
    const found = await this.prisma.redemption.findUnique({ where: { code }, select: { id: true } });
    return found !== null;
  }

  async findByCode(code: string): Promise<Redemption | null> {
    const record = await this.prisma.redemption.findUnique({ where: { code } });
    return record ? toDomain(record) : null;
  }

  async findExpiredCandidateIds(filter: RedemptionExpirationFilter, now: Date): Promise<number[]> {
    const records = await this.prisma.redemption.findMany({
      where: { ...expirationFilterWhere(filter), status: 'CONFIRMED', expiresAt: { lte: now } },
      // Usa el índice (status, expires_at)
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    return records.map((record) => record.id);
  }

  async lockForExpirationSkipLocked(id: number): Promise<Redemption | null> {
    // SKIP LOCKED: si otra instancia o un "vencer al leer" ya tiene el canje, se saltea
    const locked = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM redemptions WHERE id = ${id} FOR UPDATE SKIP LOCKED
    `;
    if (locked.length === 0) return null;
    return await this.findById(id);
  }

  async lockForUpdate(id: number): Promise<Redemption | null> {
    // Espera al que lo tenga tomado; al seguir lee el estado ya confirmado por el otro
    const locked = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM redemptions WHERE id = ${id} FOR UPDATE
    `;
    if (locked.length === 0) return null;
    return await this.findById(id);
  }

  async saveExpiration(redemption: Redemption): Promise<void> {
    await this.prisma.redemption.update({
      where: { id: redemption.getId() },
      data: {
        status: redemption.getStatus(),
        resolvedAt: redemption.getResolvedAt(),
        resolvedByAccountId: redemption.getResolvedByAccountId(),
        resolvedByName: redemption.getResolvedByName(),
      },
    });
  }

  async findCustomer(customerId: number): Promise<RedemptionCustomer> {
    return await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true },
    });
  }

  async lockByCodeForUpdate(code: string): Promise<Redemption | null> {
    const locked = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM redemptions WHERE code = ${code} FOR UPDATE
    `;
    if (locked.length === 0) return null;
    return await this.findById(locked[0].id);
  }

  async lockConfirmedForRejection(filter: AutomaticRejectionFilter, now: Date): Promise<Redemption[]> {
    // Un solo SELECT … FOR UPDATE, en orden de id, para que dos rechazos automáticos a la vez
    // tomen los bloqueos en el mismo orden
    const locked =
      'rewardId' in filter
        ? await this.prisma.$queryRaw<{ id: number }[]>`
            SELECT id FROM redemptions
            WHERE reward_id = ${filter.rewardId} AND status = 'CONFIRMED' AND expires_at > ${now}
            ORDER BY id
            FOR UPDATE
          `
        : await this.prisma.$queryRaw<{ id: number }[]>`
            SELECT id FROM redemptions
            WHERE customer_id = ${filter.customerId} AND status = 'CONFIRMED' AND expires_at > ${now}
            ORDER BY id
            FOR UPDATE
          `;
    if (locked.length === 0) return [];
    const records = await this.prisma.redemption.findMany({
      where: { id: { in: locked.map((row) => row.id) } },
      orderBy: { id: 'asc' },
    });
    return records.map(toDomain);
  }

  async saveResolution(redemption: Redemption): Promise<void> {
    await this.prisma.redemption.update({
      where: { id: redemption.getId() },
      data: {
        status: redemption.getStatus(),
        resolvedAt: redemption.getResolvedAt(),
        resolvedByAccountId: redemption.getResolvedByAccountId(),
        resolvedByName: redemption.getResolvedByName(),
        rejectionReason: redemption.getRejectionReason(),
      },
    });
  }

  private async findById(id: number): Promise<Redemption | null> {
    const record = await this.prisma.redemption.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }
}
