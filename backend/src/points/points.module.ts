import { Module } from '@nestjs/common';
import { PointsService } from './application/points.service.js';
import { PointsMovementsService } from './application/points-movements.service.js';
import { PointsRepository } from './domain/port/points.repository.js';
import { PointsMovementsRepository } from './domain/port/points-movements.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { PointsPrismaRepository } from './infrastructure/points.repository.js';
import { PointsMovementsPrismaRepository } from './infrastructure/points-movements.repository.js';
import { CustomerPointsMovementsController } from './http/customer-points-movements.controller.js';
import { PointsMovementsController } from './http/points-movements.controller.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// BASE (§8.4): el motor (PointsService) no tiene endpoint propio. Las que lo necesitan
// (consumptions, US-24, US-19/US-46) lo importan y usan PointsService dentro de su propia
// transacción ambiente. Los controllers de acá son solo las consultas de movimientos (US-26).
@Module({
  controllers: [CustomerPointsMovementsController, PointsMovementsController],
  providers: [
    PointsService,
    PointsMovementsService,
    {
      provide: PointsRepository,
      useClass: PointsPrismaRepository,
    },
    {
      provide: PointsMovementsRepository,
      useClass: PointsMovementsPrismaRepository,
    },
    {
      provide: TransactionRunner,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [PointsService],
})
export class PointsModule {}
