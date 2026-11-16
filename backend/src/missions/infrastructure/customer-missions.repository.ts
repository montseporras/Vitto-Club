import { Injectable } from '@nestjs/common';
import type { CustomerMission as PrismaCustomerMissionRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import type { MissionObjective } from '../domain/mission.js';
import type { ClaimedBy } from '../domain/mission-claim.js';
import {
  CompletedCustomerMission,
  CustomerMissionRepository,
  CustomerMissionView,
  InProgressCustomerMission,
  MissionCustomer,
} from '../domain/port/customer-mission.repository.js';

// period es DATE (día 1 del mes): se guarda como la medianoche UTC de ese día
const fromMonth = (month: string): Date => new Date(`${month}-01T00:00:00.000Z`);

// time_from y time_to son TIME: Prisma los entrega sobre el 1970-01-01 UTC
const toTime = (value: Date | null): string | null => (value ? value.toISOString().slice(11, 16) : null);
const fromTime = (time: string | null): Date | null => (time ? new Date(`1970-01-01T${time}:00.000Z`) : null);

// claimed_by solo admite CUSTOMER o SYSTEM (CHECK de §3.15)
const toClaimedBy = (value: string | null): CompletedCustomerMission['claimedBy'] =>
  value === 'CUSTOMER' || value === 'SYSTEM' ? value : null;

type RecordWithMission = PrismaCustomerMissionRecord & {
  mission: { id: number; name: string; description: string | null };
};

const MISSION_SELECT = { select: { id: true, name: true, description: true } } as const;

function toView(record: RecordWithMission): CustomerMissionView {
  return {
    id: record.id,
    mission: record.mission,
    customerId: record.customerId,
    period: record.period.toISOString().slice(0, 7),
    objectiveType: record.objectiveType,
    target: record.target.toNumber(),
    daysOfWeek: record.daysOfWeek.length === 0 ? null : record.daysOfWeek,
    timeFrom: toTime(record.timeFrom),
    timeTo: toTime(record.timeTo),
    rewardPoints: record.rewardPoints,
    progress: record.progress.toNumber(),
    status: record.status,
    completedAt: record.completedAt,
    claimedAt: record.claimedAt,
    claimedBy: toClaimedBy(record.claimedBy),
  };
}

// BASE-5: implementación de Prisma de CustomerMissionRepository. Usa el client de
// PrismaTransactionRunner para participar de la transacción ambiente, igual que los demás módulos.
@Injectable()
export class CustomerMissionsPrismaRepository implements CustomerMissionRepository {
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  protected get prisma() {
    return this.transactionRunner.client;
  }

  async existsForPeriod(missionId: number, period: string): Promise<boolean> {
    const found = await this.prisma.customerMission.findFirst({
      where: { missionId, period: fromMonth(period) },
      select: { id: true },
    });
    return found !== null;
  }

  // Los CHECK de §3.15 piden expired_at y expiration_reason solo en EXPIRED
  async expireInProgress(missionId: number, period: string, reason: string, now: Date): Promise<number> {
    const result = await this.prisma.customerMission.updateMany({
      where: { missionId, period: fromMonth(period), status: 'IN_PROGRESS' },
      data: { status: 'EXPIRED', expiredAt: now, expirationReason: reason },
    });
    return result.count;
  }

  async findCompleted(missionId: number, period: string): Promise<CompletedCustomerMission[]> {
    const records = await this.prisma.customerMission.findMany({
      where: { missionId, period: fromMonth(period), status: { in: ['COMPLETED', 'CLAIMED'] } },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true },
        },
      },
    });
    return records.map((record) => {
      // El CHECK de §3.15 garantiza completed_at en COMPLETED y CLAIMED
      if (!record.completedAt) throw new Error(`customer_missions ${record.id} sin completed_at`);
      return {
        customerMissionId: record.id,
        customer: record.customer,
        status: record.status === 'CLAIMED' ? 'CLAIMED' : 'COMPLETED',
        completedAt: record.completedAt,
        claimedAt: record.claimedAt,
        claimedBy: toClaimedBy(record.claimedBy),
        rewardPoints: record.rewardPoints,
      };
    });
  }

  async assignMissing(
    customerId: number,
    period: string,
    assignments: (MissionObjective & { missionId: number })[],
  ): Promise<void> {
    if (assignments.length === 0) return;
    await this.prisma.customerMission.createMany({
      data: assignments.map((assignment) => ({
        missionId: assignment.missionId,
        customerId,
        period: fromMonth(period),
        objectiveType: assignment.objectiveType,
        target: assignment.target,
        // La base no guarda null en days_of_week (Int[]): vacío = todos los días
        daysOfWeek: assignment.daysOfWeek ?? [],
        timeFrom: fromTime(assignment.timeFrom),
        timeTo: fromTime(assignment.timeTo),
        rewardPoints: assignment.rewardPoints,
      })),
      skipDuplicates: true,
    });
  }

  async lockInProgress(customerId: number, period: string): Promise<InProgressCustomerMission[]> {
    const periodDate = fromMonth(period);
    await this.prisma.$queryRaw`
      SELECT id FROM customer_missions
      WHERE customer_id = ${customerId} AND period = ${periodDate} AND status = 'IN_PROGRESS'
      ORDER BY id
      FOR UPDATE
    `;
    const records = await this.prisma.customerMission.findMany({
      where: { customerId, period: periodDate, status: 'IN_PROGRESS' },
      orderBy: { id: 'asc' },
    });
    return records.map((record) => ({
      id: record.id,
      missionId: record.missionId,
      objectiveType: record.objectiveType,
      target: record.target.toNumber(),
      daysOfWeek: record.daysOfWeek.length === 0 ? null : record.daysOfWeek,
      timeFrom: toTime(record.timeFrom),
      timeTo: toTime(record.timeTo),
      rewardPoints: record.rewardPoints,
      progress: record.progress.toNumber(),
    }));
  }

  async saveProgress(id: number, progress: number, completedAt: Date | null): Promise<void> {
    await this.prisma.customerMission.update({
      where: { id },
      data: completedAt ? { progress, status: 'COMPLETED', completedAt } : { progress },
    });
  }

  async lockById(id: number): Promise<CustomerMissionView | null> {
    await this.prisma.$queryRaw`SELECT id FROM customer_missions WHERE id = ${id} FOR UPDATE`;
    const record = await this.prisma.customerMission.findUnique({ where: { id }, include: { mission: MISSION_SELECT } });
    return record ? toView(record) : null;
  }

  // Los CHECK de §3.15 piden claimed_at y claimed_by solo en CLAIMED
  async markClaimed(id: number, by: ClaimedBy, now: Date): Promise<CustomerMissionView> {
    const record = await this.prisma.customerMission.update({
      where: { id },
      data: { status: 'CLAIMED', claimedAt: now, claimedBy: by },
      include: { mission: MISSION_SELECT },
    });
    return toView(record);
  }

  async lockCompletedWithReward(missionId: number, period: string): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM customer_missions
      WHERE mission_id = ${missionId} AND period = ${fromMonth(period)}
        AND status = 'COMPLETED' AND reward_points IS NOT NULL
      ORDER BY id
      FOR UPDATE
    `;
    return rows.map((row) => row.id);
  }

  async findCustomer(customerId: number): Promise<MissionCustomer | null> {
    return await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true, isActive: true },
    });
  }

  async findPendingBefore(currentMonth: string): Promise<{ id: number; period: string }[]> {
    const records = await this.prisma.customerMission.findMany({
      where: {
        period: { lt: fromMonth(currentMonth) },
        OR: [{ status: 'IN_PROGRESS' }, { status: 'COMPLETED', rewardPoints: { not: null } }],
      },
      select: { id: true, period: true },
      orderBy: [{ period: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => ({ id: record.id, period: record.period.toISOString().slice(0, 7) }));
  }

  async lockForExpiration(id: number): Promise<CustomerMissionView | null> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM customer_missions WHERE id = ${id} FOR UPDATE SKIP LOCKED
    `;
    if (rows.length === 0) return null;
    const record = await this.prisma.customerMission.findUnique({ where: { id }, include: { mission: MISSION_SELECT } });
    return record ? toView(record) : null;
  }

  // Los CHECK de §3.15 piden expired_at y expiration_reason solo en EXPIRED
  async expire(id: number, reason: string, now: Date): Promise<void> {
    await this.prisma.customerMission.update({
      where: { id },
      data: { status: 'EXPIRED', expiredAt: now, expirationReason: reason },
    });
  }
}
