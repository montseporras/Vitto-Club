import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Reward as PrismaRewardRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { Reward } from '../domain/reward.js';
import type { NewReward } from '../domain/new-reward.js';
import type { RewardEditableState } from '../domain/reward-edit.js';
import {
  RewardListFilters,
  RewardListResult,
  RewardRepository,
} from '../domain/port/reward.repository.js';

// expires_at es DATE: Prisma lo entrega como la medianoche UTC de ese día, así que la parte de
// fecha del ISO es el día guardado (sin correrlo a hora de Argentina).
function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

// Al revés: YYYY-MM-DD → la medianoche UTC de ese día, que Prisma guarda como esa fecha
function fromDateOnly(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

// Búsqueda por nombre sin tildes (§3.2.1). Mismo criterio que points-movements.repository:
// translate() en SQL, sin extensiones de Postgres, y las mismas letras en el término buscado
// (la ñ no se toca).
const ACCENTED = 'áàäâéèëêíìïîóòöôúùüû';
const PLAIN = 'aaaaeeeeiiiioooouuuu';

function foldAccents(term: string): string {
  return [...term.toLowerCase()].map((char) => PLAIN[ACCENTED.indexOf(char)] ?? char).join('');
}

// Un término buscado no puede usar los comodines de LIKE
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
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

  async findNotDeletedById(id: number): Promise<Reward | null> {
    const record = await this.prisma.reward.findFirst({ where: { id, status: { not: 'DELETED' } } });
    return record ? toDomain(record) : null;
  }

  async lockNotDeletedForUpdate(id: number): Promise<Reward | null> {
    const locked = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM rewards WHERE id = ${id} AND status <> 'DELETED' FOR UPDATE
    `;
    if (locked.length === 0) return null;
    return await this.findNotDeletedById(id);
  }

  async existsNotDeletedWithName(name: string, exceptId?: number): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM rewards
      WHERE lower(trim(name)) = lower(trim(${name})) AND status <> 'DELETED'
        AND id <> ${exceptId ?? 0}
      LIMIT 1
    `;
    return rows.length > 0;
  }

  async countConfirmed(rewardId: number, now: Date): Promise<number> {
    return (await this.countConfirmedByReward([rewardId], now)).get(rewardId) ?? 0;
  }

  async update(id: number, state: RewardEditableState): Promise<Reward> {
    const record = await this.prisma.reward.update({
      where: { id },
      data: {
        name: state.name,
        description: state.description,
        points: state.points,
        stock: state.stock,
        expiresAt: fromDateOnly(state.expiresAt),
        status: state.status,
        disabledReason: state.disabledReason,
      },
    });
    return toDomain(record);
  }

  async create(reward: NewReward): Promise<Reward> {
    const record = await this.prisma.reward.create({
      data: {
        name: reward.name,
        description: reward.description,
        points: reward.points,
        stock: reward.stock,
        expiresAt: fromDateOnly(reward.expiresAt),
      },
    });
    return toDomain(record);
  }

  async list(filters: RewardListFilters, now: Date): Promise<RewardListResult> {
    const matchingIds = filters.q !== undefined ? await this.findIdsByName(filters.q) : undefined;
    if (matchingIds && matchingIds.length === 0) {
      return { items: [], total: 0 };
    }

    const where: Prisma.RewardWhereInput = {
      AND: [
        filters.status ? { status: filters.status } : { status: { not: 'DELETED' } },
        ...(matchingIds ? [{ id: { in: matchingIds } }] : []),
      ],
    };

    const [records, total] = await Promise.all([
      this.prisma.reward.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.reward.count({ where }),
    ]);

    const confirmed = await this.countConfirmedByReward(
      records.map((record) => record.id),
      now,
    );
    return {
      items: records.map((record) => ({ reward: toDomain(record), confirmedCount: confirmed.get(record.id) ?? 0 })),
      total,
    };
  }

  // confirmedCount (§3.1 y §8.4, decisión de Jazmín: subconsulta en este repositorio y no un puerto
  // de redemptions, para no armar un ciclo entre módulos). Se lee la tabla redemptions sin importar
  // ese módulo, como points lee customers. Cuenta los CONFIRMED que todavía no vencieron: el barrido
  // de US-44 corre cada 5 minutos y puede quedar alguno CONFIRMED con expires_at pasado.
  private async countConfirmedByReward(rewardIds: number[], now: Date): Promise<Map<number, number>> {
    if (rewardIds.length === 0) return new Map();
    const groups = await this.prisma.redemption.groupBy({
      by: ['rewardId'],
      where: { rewardId: { in: rewardIds }, status: 'CONFIRMED', expiresAt: { gt: now } },
      _count: { _all: true },
    });
    return new Map(groups.map((group) => [group.rewardId, group._count._all]));
  }

  private async findIdsByName(q: string): Promise<number[]> {
    const pattern = `%${escapeLike(foldAccents(q.trim()))}%`;
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM rewards WHERE translate(lower(name), ${ACCENTED}, ${PLAIN}) LIKE ${pattern}
    `;
    return rows.map((row) => row.id);
  }
}
