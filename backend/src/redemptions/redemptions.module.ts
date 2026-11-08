import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { RedemptionsService } from './application/redemptions.service.js';
import { RedemptionRepository } from './domain/port/redemption.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { CustomerRedemptionsController } from './http/customer-redemptions.controller.js';
import { RedemptionsPrismaRepository } from './infrastructure/redemptions.repository.js';
import { PointsModule } from '../points/points.module.js';
import { RewardsModule } from '../rewards/rewards.module.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// BASE-4 (contrato S4 §8.4): canjes, código, vencimiento, uso, rechazo y cancelación. US-40 agrega
// confirmar (RedemptionsService.confirm); las demás historias (US-41 a US-45) agregan lo suyo.
// Dependencias (CA-B4.8): redemptions usa rewards (RewardsService) y points
// (PointsService.canjear) dentro de la transacción ambiente. Ni rewards ni points importan
// redemptions. customers, employees y audit no importan redemptions: la dependencia va en un solo
// sentido (mismo patrón que consumptions).
@Module({
  imports: [AuditModule, CustomersModule, EmployeesModule, RewardsModule, PointsModule],
  controllers: [CustomerRedemptionsController],
  providers: [
    RedemptionsService,
    {
      provide: RedemptionRepository,
      useClass: RedemptionsPrismaRepository,
    },
    {
      provide: TransactionRunner,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [RedemptionsService],
})
export class RedemptionsModule {}
