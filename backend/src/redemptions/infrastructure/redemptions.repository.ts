import { Injectable } from '@nestjs/common';
import type { Redemption as PrismaRedemptionRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import type { NewRedemption } from '../domain/new-redemption.js';
import { Redemption } from '../domain/redemption.js';
import { RedemptionRepository } from '../domain/port/redemption.repository.js';

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

  async create(data: NewRedemption): Promise<Redemption> {
    const record = await this.prisma.redemption.create({
      data: {
        code: data.code,
        customerId: data.customerId,
        rewardId: data.rewardId,
        rewardName: data.rewardName,
        points: data.points,
        origin: data.origin,
        confirmedByAccountId: data.confirmedByAccountId,
        confirmedByName: data.confirmedByName,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
      },
    });
    return toDomain(record);
  }

  async existsByCode(code: string): Promise<boolean> {
    const found = await this.prisma.redemption.findUnique({ where: { code }, select: { id: true } });
    return found !== null;
  }

  async findByCode(code: string): Promise<Redemption | null> {
    const record = await this.prisma.redemption.findUnique({ where: { code } });
    return record ? toDomain(record) : null;
  }

  // US-42 (§3.9.1, orden de bloqueos: recompensa → canje → customer_points)
  async lockByCode(code: string): Promise<Redemption | null> {
    const locked = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM redemptions WHERE code = ${code} FOR UPDATE
    `;
    if (locked.length === 0) return null;

    const record = await this.prisma.redemption.findUnique({ where: { code } });
    return record ? toDomain(record) : null;
  }

  async update(redemption: Redemption): Promise<void> {
    await this.prisma.redemption.update({
      where: { id: redemption.getId() },
      data: {
        status: redemption.getStatus(),
        resolvedAt: redemption.getResolvedAt(),
        resolvedByAccountId: redemption.getResolvedByAccountId(),
        resolvedByName: redemption.getResolvedByName(),
        rejectionReason: redemption.getRejectionReason(),
        balanceBefore: redemption.getBalanceBefore(),
        balanceAfter: redemption.getBalanceAfter(),
      },
    });
  }
}
