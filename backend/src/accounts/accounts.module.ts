import { Module } from '@nestjs/common';
import { AccountsService } from './application/accounts.service.js';
import { EmployeeEventsListener } from './application/employee-events.listener.js';
import { AccountRepository } from './domain/port/account.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { AccountPrismaRepository } from './infrastructure/accounts.repository.js';
import { AccountsController } from './http/accounts.controller.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// IMPORTANTE: este módulo todavía NO se importa en AppModule (ver app.module.ts). Que
// AccountsController esté registrado acá no lo expone a ningún request real: Nest solo
// monta las rutas de los controllers que pertenecen a módulos alcanzables desde AppModule.
// Mientras eso siga así, es seguro tener el controller sin JwtAuthGuard/RolesGuard.
// Tampoco se provee PasswordHasher: ese puerto sigue sin implementación concreta
// (pendiente de auth) — si este módulo se registrara en AppModule antes de que exista una,
// Nest fallaría al resolver AccountsService. Deliberado: no se inventa un hasher falso.
//
// Sin forwardRef: Accounts -> Employees y Accounts -> Customers son dependencias en un
// solo sentido (ninguno de los dos importa a Accounts). La integración Employee -> Account
// es por eventos (EmployeeEventsListener), no por import circular.
@Module({
  imports: [EmployeesModule, CustomersModule],
  controllers: [AccountsController],
  providers: [
    AccountsService,
    EmployeeEventsListener,
    {
      provide: AccountRepository,
      useClass: AccountPrismaRepository,
    },
    // Vincular el puerto de transacción ambiente con la implementación real (PrismaModule
    // es @Global(), así que PrismaTransactionRunner ya está disponible para ligarlo acá).
    {
      provide: TransactionRunner,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [AccountsService],
})
export class AccountsModule {}
