import { Module } from '@nestjs/common';
import { CustomersController } from './http/customers.controller.js';
import { CustomersService } from './application/customers.service.js';
import { CustomerRepository } from './domain/port/customer.repository.js';
import { CustomerPrismaRepository } from './infrastructure/customers.repository.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';
import { AuditModule } from '../audit/audit.module.js';

// Sin forwardRef: EmployeesModule ya no importa CustomersModule (Customers -> Employees es
// la única dirección, ver CustomersService). Import plano.
@Module({
  imports: [EmployeesModule, AuditModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
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
