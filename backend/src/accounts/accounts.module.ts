import { forwardRef, Module } from '@nestjs/common';
import { AccountsService } from './application/accounts.service.js';
import { AccountRepository } from './domain/port/account.repository.js';
import { AccountPrismaRepository } from './infrastructure/accounts.repository.js';
import { SessionRevoker } from './domain/port/session-revoker.js';
import { PrismaSessionRevoker } from './infrastructure/session-revoker.repository.js';
import { AccountsController } from './http/accounts.controller.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { CustomersModule } from '../customers/customers.module.js';

// IMPORTANTE: este módulo todavía NO se importa en AppModule (ver app.module.ts). Que
// AccountsController esté registrado acá no lo expone a ningún request real: Nest solo
// monta las rutas de los controllers que pertenecen a módulos alcanzables desde AppModule.
// Mientras eso siga así, es seguro tener el controller sin JwtAuthGuard/RolesGuard.
// Tampoco se provee PasswordHasher: ese puerto sigue sin implementación concreta
// (pendiente de auth) — si este módulo se registrara en AppModule antes de que exista una,
// Nest fallaría al resolver AccountsService. Deliberado: no se inventa un hasher falso.
@Module({
  // forwardRef en ambos imports: EmployeesModule importa AccountsModule en sentido
  // inverso (ciclo directo Accounts<->Employees), y CustomersModule importa EmployeesModule
  // (que a su vez importa AccountsModule), lo que cierra un ciclo de tres módulos
  // Accounts -> Customers -> Employees -> Accounts.
  imports: [forwardRef(() => EmployeesModule), forwardRef(() => CustomersModule)],
  controllers: [AccountsController],
  providers: [
    AccountsService,
    {
      provide: AccountRepository,
      useClass: AccountPrismaRepository,
    },
    {
      provide: SessionRevoker,
      useClass: PrismaSessionRevoker,
    },
  ],
  exports: [AccountsService],
})
export class AccountsModule {}
