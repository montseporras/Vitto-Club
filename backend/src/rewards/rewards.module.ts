import { Module } from '@nestjs/common';
import { RewardsService } from './application/rewards.service.js';
import { RewardRepository } from './domain/port/reward.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { RewardsPrismaRepository } from './infrastructure/rewards.repository.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// BASE-4 (contrato S4 §8.4): catálogo, estados y proceso de vencidas. Todavía sin controllers:
// los endpoints los agrega cada historia (US-34 a US-39).
// Dependencias: rewards NO importa redemptions (CA-B4.8). Para rechazar los canjes al desactivar
// o eliminar, publica reward.deactivated / reward.deleted y redemptions escucha (US-43).
@Module({
  providers: [
    RewardsService,
    {
      provide: RewardRepository,
      useClass: RewardsPrismaRepository,
    },
    {
      provide: TransactionRunner,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [RewardsService],
})
export class RewardsModule {}
