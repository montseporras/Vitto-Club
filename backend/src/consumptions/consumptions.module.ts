import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { ConsumptionsService } from './application/consumptions.service.js';
import { ConsumptionRepository } from './domain/port/consumption.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { ConsumptionPrismaRepository } from './infrastructure/consumptions.repository.js';
import { ConsumptionsController } from './http/consumptions.controller.js';
import { CustomerConsumptionsController } from './http/customer-consumptions.controller.js';
import { CustomersModule } from '../customers/customers.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';
import { PointsModule } from '../points/points.module.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// Registrado en AppModule (ver app.module.ts). register()/anular() escriben el consumo, los
// puntos (PointsService) y la auditoría (AuditService, CONSUMPTION_REGISTERED/CONSUMPTION_VOIDED)
// en la misma transacción. audit no importa a consumptions: la dependencia va en un solo sentido.
@Module({
  imports: [AuditModule, CustomersModule, EmployeesModule, LoyaltyModule, PointsModule],
  controllers: [ConsumptionsController, CustomerConsumptionsController],
  providers: [
    ConsumptionsService,
    {
      provide: ConsumptionRepository,
      useClass: ConsumptionPrismaRepository,
    },
    {
      provide: TransactionRunner,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [ConsumptionsService],
})
export class ConsumptionsModule {}
