import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Mission as PrismaMissionRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import type { Mission, MissionPendingChanges } from '../domain/mission.js';
import type { MissionEditableState } from '../domain/mission-edit.js';
import type { NewMission } from '../domain/new-mission.js';
import {
  MissionListFilters,
  MissionListResult,
  MissionRepository,
} from '../domain/port/mission.repository.js';

// Búsqueda por nombre sin tildes (§3.1.2). Mismo criterio que rewards.repository: translate() en
// SQL, sin extensiones de Postgres, y las mismas letras en el término buscado (la ñ no se toca).
// Copia intencional: cada módulo tiene la suya.
const ACCENTED = 'áàäâéèëêíìïîóòöôúùüû';
const PLAIN = 'aaaaeeeeiiiioooouuuu';

function foldAccents(term: string): string {
  return [...term.toLowerCase()].map((char) => PLAIN[ACCENTED.indexOf(char)] ?? char).join('');
}

// Un término buscado no puede usar los comodines de LIKE
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// start_month y end_month son DATE (día 1): Prisma los entrega como la medianoche UTC de ese día
const toMonth = (value: Date): string => value.toISOString().slice(0, 7);
const fromMonth = (month: string): Date => new Date(`${month}-01T00:00:00.000Z`);

// time_from y time_to son TIME: Prisma los entrega sobre el 1970-01-01 UTC
const toTime = (value: Date | null): string | null => (value ? value.toISOString().slice(11, 16) : null);
const fromTime = (time: string | null): Date | null => (time ? new Date(`1970-01-01T${time}:00.000Z`) : null);

// La base no guarda null en days_of_week (Int[]): vacío = todos los días, y la API manda null
// (decisión de Jazmín).
const toDays = (days: number[]): number[] | null => (days.length === 0 ? null : days);

export function toDomain(record: PrismaMissionRecord): Mission {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    objectiveType: record.objectiveType,
    target: record.target.toNumber(),
    daysOfWeek: toDays(record.daysOfWeek),
    timeFrom: toTime(record.timeFrom),
    timeTo: toTime(record.timeTo),
    rewardPoints: record.rewardPoints,
    startMonth: toMonth(record.startMonth),
    endMonth: record.endMonth ? toMonth(record.endMonth) : null,
    // La escribe US-29 con la forma de §3.1.1
    pendingChanges: (record.pendingChanges ?? null) as MissionPendingChanges | null,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// BASE-5: implementación de Prisma de MissionRepository. Usa el client de PrismaTransactionRunner
// para participar de la transacción ambiente, igual que los demás módulos.
@Injectable()
export class MissionsPrismaRepository implements MissionRepository {
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  protected get prisma() {
    return this.transactionRunner.client;
  }

  async existsNotDeletedWithName(name: string, exceptId?: number): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM missions
      WHERE lower(trim(name)) = lower(trim(${name})) AND status <> 'DELETED'
        AND id <> ${exceptId ?? 0}
      LIMIT 1
    `;
    return rows.length > 0;
  }

  async create(mission: NewMission): Promise<Mission> {
    const record = await this.prisma.mission.create({
      data: {
        name: mission.name,
        description: mission.description,
        objectiveType: mission.objectiveType,
        target: mission.target,
        daysOfWeek: mission.daysOfWeek ?? [],
        timeFrom: fromTime(mission.timeFrom),
        timeTo: fromTime(mission.timeTo),
        rewardPoints: mission.rewardPoints,
        startMonth: fromMonth(mission.startMonth),
        endMonth: mission.endMonth ? fromMonth(mission.endMonth) : null,
      },
    });
    return toDomain(record);
  }

  async findNotDeletedById(id: number): Promise<Mission | null> {
    const record = await this.prisma.mission.findFirst({ where: { id, status: { not: 'DELETED' } } });
    return record ? toDomain(record) : null;
  }

  async lockNotDeletedForUpdate(id: number): Promise<Mission | null> {
    await this.prisma.$queryRaw`SELECT id FROM missions WHERE id = ${id} FOR UPDATE`;
    return await this.findNotDeletedById(id);
  }

  async countCompleted(id: number, period: string): Promise<number> {
    return (await this.countCompletedByMission([id], fromMonth(period))).get(id) ?? 0;
  }

  async update(id: number, state: MissionEditableState): Promise<Mission> {
    const record = await this.prisma.mission.update({
      where: { id },
      data: {
        name: state.name,
        description: state.description,
        objectiveType: state.objectiveType,
        target: state.target,
        daysOfWeek: state.daysOfWeek ?? [],
        timeFrom: fromTime(state.timeFrom),
        timeTo: fromTime(state.timeTo),
        rewardPoints: state.rewardPoints,
        startMonth: fromMonth(state.startMonth),
        endMonth: state.endMonth ? fromMonth(state.endMonth) : null,
        pendingChanges: state.pendingChanges ?? Prisma.DbNull,
      },
    });
    return toDomain(record);
  }

  async markDeleted(id: number, now: Date): Promise<Mission> {
    const record = await this.prisma.mission.update({ where: { id }, data: { status: 'DELETED', deletedAt: now } });
    return toDomain(record);
  }

  async findRunningInMonth(month: string): Promise<Mission[]> {
    const current = fromMonth(month);
    const records = await this.prisma.mission.findMany({
      where: {
        status: 'ACTIVE',
        startMonth: { lte: current },
        OR: [{ endMonth: null }, { endMonth: { gte: current } }],
      },
      orderBy: { id: 'asc' },
    });
    return records.map(toDomain);
  }

  // §3.1.2. La fase se filtra con el mes actual (§2.2): RUNNING = empezó y no terminó; UPCOMING =
  // empieza más adelante; FINISHED = su último mes ya pasó.
  async list(filters: MissionListFilters): Promise<MissionListResult> {
    const matchingIds = filters.q !== undefined ? await this.findIdsByName(filters.q) : undefined;
    if (matchingIds && matchingIds.length === 0) {
      return { items: [], total: 0 };
    }

    const current = fromMonth(filters.currentMonth);
    const phaseWhere: Record<NonNullable<MissionListFilters['phase']>, Prisma.MissionWhereInput> = {
      RUNNING: { startMonth: { lte: current }, OR: [{ endMonth: null }, { endMonth: { gte: current } }] },
      UPCOMING: { startMonth: { gt: current } },
      FINISHED: { endMonth: { lt: current } },
    };

    const where: Prisma.MissionWhereInput = {
      AND: [
        { status: { not: 'DELETED' } },
        ...(filters.phase ? [phaseWhere[filters.phase]] : []),
        ...(matchingIds ? [{ id: { in: matchingIds } }] : []),
      ],
    };
    const direction = filters.order === 'OLDEST' ? 'asc' : 'desc';

    const [records, total] = await Promise.all([
      this.prisma.mission.findMany({
        where,
        orderBy: [{ createdAt: direction }, { id: direction }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.mission.count({ where }),
    ]);

    const completed = await this.countCompletedByMission(
      records.map((record) => record.id),
      current,
    );
    return {
      items: records.map((record) => ({ mission: toDomain(record), completedCount: completed.get(record.id) ?? 0 })),
      total,
    };
  }

  // completedCount (§3.1.1): clientes que la completaron este mes (Completada + Reclamada)
  private async countCompletedByMission(missionIds: number[], period: Date): Promise<Map<number, number>> {
    if (missionIds.length === 0) return new Map();
    const groups = await this.prisma.customerMission.groupBy({
      by: ['missionId'],
      where: { missionId: { in: missionIds }, period, status: { in: ['COMPLETED', 'CLAIMED'] } },
      _count: { _all: true },
    });
    return new Map(groups.map((group) => [group.missionId, group._count._all]));
  }

  private async findIdsByName(q: string): Promise<number[]> {
    const pattern = `%${escapeLike(foldAccents(q.trim()))}%`;
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM missions WHERE translate(lower(name), ${ACCENTED}, ${PLAIN}) LIKE ${pattern}
    `;
    return rows.map((row) => row.id);
  }
}
