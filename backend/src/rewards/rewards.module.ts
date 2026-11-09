import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { RewardsAvailabilityService } from './application/rewards-availability.service.js';
import { RewardsService } from './application/rewards.service.js';
import { RewardRepository } from './domain/port/reward.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { RewardsPrismaRepository } from './infrastructure/rewards.repository.js';
import { RewardsExpirationScheduler } from './infrastructure/rewards-expiration.scheduler.js';
import { RewardsController } from './http/rewards.controller.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// BASE-4 (contrato S4 §8.4): catálogo, estados y proceso de vencidas. Todavía sin controllers:
// los endpoints los agrega cada historia (US-34 a US-39).
// Dependencias: rewards NO importa redemptions (CA-B4.8). Para rechazar los canjes al desactivar
// o eliminar, publica reward.deactivated / reward.deleted y redemptions escucha (US-43).
// US-37: la disponibilidad automática (reevaluarDisponibilidad y el proceso diario) audita con
// AuditModule, que no importa a ningún módulo de negocio, así que no se arma un ciclo.
// RewardsAvailabilityService se exporta para US-42 (redemptions, al usar un canje).
@Module({
  imports: [AuditModule],
  // US-40: GET /recompensas/disponibles. El resto (listado del Administrador, detalle, crear,
  // editar...) lo agregan US-34 a US-38.
  controllers: [RewardsController],
  providers: [
    RewardsService,
    RewardsAvailabilityService,
    RewardsExpirationScheduler,
    {
      provide: RewardRepository,
      useClass: RewardsPrismaRepository,
    },
    {
      provide: TransactionRunner,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [RewardsService, RewardsAvailabilityService],
})
export class RewardsModule {}
