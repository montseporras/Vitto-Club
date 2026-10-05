import { forwardRef, Module } from '@nestjs/common';
import { EmployeesController } from './http/employees.controller.js';
import { EmployeesService } from './application/employees.service.js';
import { EmployeeRepository } from './domain/port/employee.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { EmployeePrismaRepository } from './infrastructure/employees.repository.js';
import { CustomersModule } from '../customers/customers.module.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// Employees NO importa AccountsModule: la integración Employee -> Account se hace vía
// eventos de dominio (employee.deactivated / employee.role-changed), no por llamada
// directa. Ver docs/ARCHITECTURE.md y src/accounts/application/employee-events.listener.ts.
@Module({
  // forwardRef: CustomersModule importa EmployeesModule en sentido inverso (unicidad
  // global de email entre Employee y Customer, ver EmployeesService/CustomersService).
  imports: [forwardRef(() => CustomersModule)],
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    // Vincular el puerto con su implementación en Prisma
    {
      provide: EmployeeRepository,
      useClass: EmployeePrismaRepository,
    },
    // Vincular el puerto de transacción ambiente con la implementación real (PrismaModule
    // es @Global(), así que PrismaTransactionRunner ya está disponible para ligarlo acá).
    {
      provide: TransactionRunner,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [EmployeesService],
})
export class EmployeesModule {}
