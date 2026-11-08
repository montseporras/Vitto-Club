import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { RedemptionsExpirationService } from './application/redemptions-expiration.service.js';
import { RedemptionRepository } from './domain/port/redemption.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { RedemptionsPrismaRepository } from './infrastructure/redemptions.repository.js';
import { RedemptionsExpirationScheduler } from './infrastructure/redemptions-expiration.scheduler.js';
import { PointsModule } from '../points/points.module.js';
import { RewardsModule } from '../rewards/rewards.module.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// BASE-4 (contrato S4 §8.4): canjes, código, vencimiento, uso, rechazo y cancelación. Todavía sin
// controllers: los agrega cada historia (US-40 a US-45).
// Dependencias (CA-B4.8): redemptions usa rewards (RewardsService) y points
// (PointsService.canjear) dentro de la transacción ambiente. Ni rewards ni points importan
// redemptions.
// US-44: el vencimiento (cron, arranque y comando) audita con AuditModule, que no importa a ningún
// módulo de negocio, así que no se arma un ciclo. RedemptionsExpirationService se exporta para el
// "vencer al leer" de US-41, US-42, US-43 y US-45.
@Module({
  imports: [AuditModule, RewardsModule, PointsModule],
  providers: [
    RedemptionsExpirationService,
    RedemptionsExpirationScheduler,
    {
      provide: RedemptionRepository,
      useClass: RedemptionsPrismaRepository,
    },
    {
      provide: TransactionRunner,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [RedemptionsExpirationService],
})
export class RedemptionsModule {}
