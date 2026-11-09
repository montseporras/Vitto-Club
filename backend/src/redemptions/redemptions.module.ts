import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { RedemptionConfirmationService } from './application/redemption-confirmation.service.js';
import { RedemptionEventsListener } from './application/redemption-events.listener.js';
import { RedemptionResolutionService } from './application/redemption-resolution.service.js';
import { RedemptionUseService } from './application/redemption-use.service.js';
import { RedemptionsExpirationService } from './application/redemptions-expiration.service.js';
import { RedemptionsQueryService } from './application/redemptions-query.service.js';
import { RedemptionRepository } from './domain/port/redemption.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { RedemptionsPrismaRepository } from './infrastructure/redemptions.repository.js';
import { RedemptionsExpirationScheduler } from './infrastructure/redemptions-expiration.scheduler.js';
import { CustomerRedemptionsController } from './http/customer-redemptions.controller.js';
import { CustomerRewardsController } from './http/customer-rewards.controller.js';
import { CustomerRedemptionsStaffController } from './http/customer-redemptions-staff.controller.js';
import { RedemptionsController } from './http/redemptions.controller.js';
import { PointsModule } from '../points/points.module.js';
import { RewardsModule } from '../rewards/rewards.module.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// BASE-4 (contrato S4 §8.4): canjes, código, vencimiento, uso, rechazo y cancelación.
// Dependencias (CA-B4.8): redemptions usa rewards (RewardsService, RewardsAvailabilityService) y
// points (PointsService.canjear) dentro de la transacción ambiente. Ni rewards ni points importan
// redemptions.
// US-44: el vencimiento (cron, arranque y comando) audita con AuditModule, que no importa a ningún
// módulo de negocio, así que no se arma un ciclo. RedemptionsExpirationService se exporta para el
// "vencer al leer" de US-41, US-42, US-43 y US-45.
// US-40 y US-43: confirmar, rechazar (empleado), cancelar (Cliente) y el rechazo automático por
// eventos (reward.deactivated, reward.deleted, customer.deactivated). Importa EmployeesModule para
// el nombre del empleado que confirma o rechaza, como consumptions (decisión de Melisa); employees
// no importa redemptions.
@Module({
  imports: [AuditModule, EmployeesModule, RewardsModule, PointsModule],
  // US-45: CustomerRedemptionsController (customers/me/canjes) va ANTES que
  // CustomerRedemptionsStaffController (customers/:id/canjes), así "me" no se toma como un id (§4).
  // US-39: CustomerRewardsController (customers/me/recompensas), el catálogo del Cliente
  controllers: [
    RedemptionsController,
    CustomerRedemptionsController,
    CustomerRewardsController,
    CustomerRedemptionsStaffController,
  ],
  providers: [
    RedemptionsExpirationService,
    RedemptionsExpirationScheduler,
    RedemptionConfirmationService,
    RedemptionResolutionService,
    RedemptionUseService,
    RedemptionEventsListener,
    RedemptionsQueryService,
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
