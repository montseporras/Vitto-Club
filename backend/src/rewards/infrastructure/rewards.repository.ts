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

  async findActive(): Promise<Reward[]> {
    const records = await this.prisma.reward.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ points: 'asc' }, { id: 'asc' }],
    });
    return records.map(toDomain);
  }

  // US-42 (§3.9.1, orden de bloqueos: recompensa → canje → customer_points)
  async lockById(id: number): Promise<Reward | null> {
    const locked = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM rewards WHERE id = ${id} FOR UPDATE
    `;
    if (locked.length === 0) return null;

    const record = await this.prisma.reward.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async update(reward: Reward): Promise<void> {
    await this.prisma.reward.update({
      where: { id: reward.getId() },
      data: {
        stock: reward.getStock(),
        usedCount: reward.getUsedCount(),
        status: reward.getStatus(),
        disabledReason: reward.getDisabledReason(),
      },
    });
  }
}
