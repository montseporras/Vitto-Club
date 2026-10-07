import { Module } from '@nestjs/common';
import { AccountsService } from './application/accounts.service.js';
import { EmployeeEventsListener } from './application/employee-events.listener.js';
import { AccountRepository } from './domain/port/account.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { PasswordHasher } from './domain/port/password-hasher.js';
import { AccountPrismaRepository } from './infrastructure/accounts.repository.js';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher.js';
import { AccountsController } from './http/accounts.controller.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';

// accounts es dueño de la tabla Account y de las contraseñas: el adaptador de bcryptjs vive
// acá (no en auth) porque si estuviera en auth, accounts tendría que importar auth, y auth ya
// importa accounts para el login.
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
    // Algoritmo de hash de contraseñas. Para cambiarlo se escribe otro adaptador del puerto.
    {
      provide: PasswordHasher,
      useClass: BcryptPasswordHasher,
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
