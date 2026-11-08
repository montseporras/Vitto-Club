import { Injectable } from '@nestjs/common';
import type { Reward as PrismaRewardRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { Reward } from '../domain/reward.js';
import { RewardRepository } from '../domain/port/reward.repository.js';

// expires_at es DATE: Prisma lo entrega como la medianoche UTC de ese día, así que la parte de
// fecha del ISO es el día guardado (sin correrlo a hora de Argentina).
function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function toDomain(record: PrismaRewardRecord): Reward {
  return Reward.reconstruct({
    id: record.id,
    name: record.name,
    description: record.description,
    points: record.points,
    stock: record.stock,
    expiresAt: toDateOnly(record.expiresAt),
    status: record.status,
    disabledReason: record.disabledReason,
    usedCount: record.usedCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  });
}

@Injectable()
export class RewardsPrismaRepository implements RewardRepository {
  // Mismo patrón que los demás módulos: usa el client de PrismaTransactionRunner para
  // participar de la transacción ambiente.
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  async findById(id: number): Promise<Reward | null> {
    const record = await this.prisma.reward.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findExpiredCandidateIds(hoyArgentina: string): Promise<number[]> {
    const records = await this.prisma.reward.findMany({
      // expires_at es DATE: se compara con la medianoche UTC del día, igual que lo guarda Prisma.
      // Usa el índice (status, expires_at)
      where: { status: 'ACTIVE', expiresAt: { lt: new Date(`${hoyArgentina}T00:00:00.000Z`) } },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    return records.map((record) => record.id);
  }

  async lockForUpdateSkipLocked(id: number): Promise<Reward | null> {
    // SKIP LOCKED: si una edición, un uso u otra corrida del proceso la tiene tomada, se saltea
    const locked = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM rewards WHERE id = ${id} FOR UPDATE SKIP LOCKED
    `;
    if (locked.length === 0) return null;
    return await this.findById(id);
  }

  async saveAvailability(reward: Reward): Promise<void> {
    await this.prisma.reward.update({
      where: { id: reward.getId() },
      data: { status: reward.getStatus(), disabledReason: reward.getDisabledReason() },
    });
  }
}
