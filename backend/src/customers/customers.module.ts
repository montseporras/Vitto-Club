import { Module } from '@nestjs/common';
import { CustomersController } from './http/customers.controller.js';
import { CustomersService } from './application/customers.service.js';
import { CustomerRepository } from './domain/port/customer.repository.js';
import { CustomerPrismaRepository } from './infrastructure/customers.repository.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';
import { PointsModule } from '../points/points.module.js';
import { CustomerPointsAdjustmentService } from './application/customer-points-adjustment.service.js';

// Sin forwardRef: EmployeesModule ya no importa CustomersModule (Customers -> Employees es
// la única dirección, ver CustomersService). Import plano.
@Module({
  // PointsModule: ajuste de puntos (US-24). points no importa customers, así que no hay ciclo.
  imports: [EmployeesModule, AuditModule, PointsModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomerPointsAdjustmentService,
    // Vincular la abstracción (puerto) con la implementación en memoria (adaptador)
    {
      provide: CustomerRepository,
      useClass: CustomerPrismaRepository,
    },
    // Puerto de transacción ambiente ligado a la implementación real (PrismaModule es @Global())
    {
      provide: TransactionRunner,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
