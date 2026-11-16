import { Injectable } from '@nestjs/common';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import {
  CompletedCustomerMission,
  CustomerMissionRepository,
} from '../domain/port/customer-mission.repository.js';

// period es DATE (día 1 del mes): se guarda como la medianoche UTC de ese día
const fromMonth = (month: string): Date => new Date(`${month}-01T00:00:00.000Z`);

// claimed_by solo admite CUSTOMER o SYSTEM (CHECK de §3.15)
const toClaimedBy = (value: string | null): CompletedCustomerMission['claimedBy'] =>
  value === 'CUSTOMER' || value === 'SYSTEM' ? value : null;

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
}
