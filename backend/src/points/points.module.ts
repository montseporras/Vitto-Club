import { Module } from '@nestjs/common';
import { PointsService } from './application/points.service.js';
import { PointsRepository } from './domain/port/points.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { PointsPrismaRepository } from './infrastructure/points.repository.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// BASE (§8.4): no tiene controller — ninguna historia habla con este módulo por HTTP.
// Las que lo necesitan (consumptions, US-24, US-19/US-46) lo importan y usan PointsService
// dentro de su propia transacción ambiente.
@Module({
  providers: [
    PointsService,
    {
      provide: PointsRepository,
      useClass: PointsPrismaRepository,
    },
    {
      provide: TransactionRunner,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [PointsService],
})
export class PointsModule {}
