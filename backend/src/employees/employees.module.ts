import { Module } from '@nestjs/common';
import { EmployeesController } from './http/employees.controller.js';
import { EmployeesService } from './application/employees.service.js';
import { EmployeeRepository } from './domain/port/employee.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { EmployeePrismaRepository } from './infrastructure/employees.repository.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// Employees NO importa CustomersModule ni AccountsModule, ni conoce a ninguno de los dos
// en código: Customers -> Employees es la única dirección (unicidad de email, ver
// CustomersService), y Employee -> Account es exclusivamente por eventos de dominio
// (employee.deactivated / employee.role-changed). Ver docs/ARCHITECTURE.md y
// src/accounts/application/employee-events.listener.ts.
@Module({
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
