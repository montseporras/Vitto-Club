import { Injectable, NotFoundException } from '@nestjs/common';
import type { Consumption as PrismaConsumptionRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { Consumption } from '../domain/consumption.js';
import { ConsumptionRepository } from '../domain/port/consumption.repository.js';

// amount/baseAmount son DECIMAL(12,2) en Prisma -> llegan como Prisma.Decimal; el dominio
// trabaja con number (igual criterio que loyalty con PointsEquivalence).
export function toDomain(record: PrismaConsumptionRecord): Consumption {
  return Consumption.reconstruct({
    id: record.id,
    customerId: record.customerId,
    amount: Number(record.amount),
    notes: record.notes,
    points: record.points,
    bonusPoints: record.bonusPoints,
    configurationVersion: record.configurationVersion,
    baseAmount: Number(record.baseAmount),
    pointsAwarded: record.pointsAwarded,
    registeredByAccountId: record.registeredByAccountId,
    registeredByName: record.registeredByName,
    status: record.status,
    createdAt: record.createdAt,
    voidedAt: record.voidedAt,
    voidedByAccountId: record.voidedByAccountId,
    voidedByName: record.voidedByName,
    voidedReason: record.voidedReason,
  });
}

@Injectable()
export class ConsumptionPrismaRepository implements ConsumptionRepository {
  // Mismo patrón que accounts/employees/customers: inyecta PrismaTransactionRunner y usa
  // .client, para participar de la transacción ambiente sin saber nada de transacciones.
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  async save(consumption: Consumption): Promise<Consumption> {
    const created = await this.prisma.consumption.create({
      data: {
        customerId: consumption.getCustomerId(),
        amount: consumption.getAmount(),
        notes: consumption.getNotes(),
        points: consumption.getPoints(),
        bonusPoints: consumption.getBonusPoints(),
        configurationVersion: consumption.getConfigurationVersion(),
        baseAmount: consumption.getBaseAmount(),
        pointsAwarded: consumption.getPointsAwarded(),
        registeredByAccountId: consumption.getRegisteredByAccountId(),
        registeredByName: consumption.getRegisteredByName(),
      },
    });
    return toDomain(created);
  }

  async findByCode(code: string): Promise<Consumption | null> {
    const id = Consumption.parseCode(code);
    if (id === null) return null;

    const record = await this.prisma.consumption.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async existsRegisteredByCustomerId(customerId: number): Promise<boolean> {
    const match = await this.prisma.consumption.findFirst({
      where: { customerId, status: 'REGISTERED' },
      select: { id: true },
    });
    return match !== null;
  }

  async updateVoidStatus(consumption: Consumption): Promise<void> {
    const id = consumption.getId();
    if (!id) {
      throw new NotFoundException('Consumption id is required to update');
    }

    await this.prisma.consumption.update({
      where: { id },
      data: {
        status: consumption.getStatus(),
        voidedAt: consumption.getVoidedAt(),
        voidedByAccountId: consumption.getVoidedByAccountId(),
        voidedByName: consumption.getVoidedByName(),
        voidedReason: consumption.getVoidedReason(),
      },
    });
  }
}
