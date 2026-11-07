import { Injectable } from '@nestjs/common';
import type { Redemption as PrismaRedemptionRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
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

  async existsByCode(code: string): Promise<boolean> {
    const found = await this.prisma.redemption.findUnique({ where: { code }, select: { id: true } });
    return found !== null;
  }

  async findByCode(code: string): Promise<Redemption | null> {
    const record = await this.prisma.redemption.findUnique({ where: { code } });
    return record ? toDomain(record) : null;
  }
}
