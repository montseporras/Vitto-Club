import { Module } from '@nestjs/common';
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

// Registrado en AppModule (ver app.module.ts). La auditoría (CONSUMPTION_REGISTERED/
// CONSUMPTION_VOIDED, US-57) todavía no está implementada: register()/anular() funcionan
// de punta a punta (consumo real + puntos acreditados/revertidos vía PointsService), pero
// no terminan de cumplir CA-21.5/CA-22.7 completos hasta que exista esa pieza (quedan
// marcados con TODO en consumptions.service.ts). Nada de esto bloquea la ruta HTTP.
@Module({
  imports: [CustomersModule, EmployeesModule, LoyaltyModule, PointsModule],
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
