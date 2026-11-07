import { Module } from '@nestjs/common';
import { RedemptionRepository } from './domain/port/redemption.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { RedemptionsPrismaRepository } from './infrastructure/redemptions.repository.js';
import { PointsModule } from '../points/points.module.js';
import { RewardsModule } from '../rewards/rewards.module.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// BASE-4 (contrato S4 §8.4): canjes, código, vencimiento, uso, rechazo y cancelación. Todavía sin
// servicios ni controllers: los agrega cada historia (US-40 a US-45).
// Dependencias (CA-B4.8): redemptions usa rewards (RewardsService) y points
// (PointsService.canjear) dentro de la transacción ambiente. Ni rewards ni points importan
// redemptions.
@Module({
  imports: [RewardsModule, PointsModule],
  providers: [
    {
      provide: RedemptionRepository,
      useClass: RedemptionsPrismaRepository,
    },
    {
      provide: TransactionRunner,
      useExisting: PrismaTransactionRunner,
    },
  ],
})
export class RedemptionsModule {}
