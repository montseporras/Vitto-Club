import { Injectable } from '@nestjs/common';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { StatisticsRepository } from '../domain/port/statistics.repository.js';

// BASE-5: implementación de Prisma de StatisticsRepository, sin operaciones todavía. Usa el client de
// PrismaTransactionRunner para participar de la transacción ambiente, igual que los demás módulos.
@Injectable()
export class StatisticsPrismaRepository implements StatisticsRepository {
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  protected get prisma() {
    return this.transactionRunner.client;
  }
}
