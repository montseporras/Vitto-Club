import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaModule } from './prisma/prisma.module.js';
import { PrismaService } from './prisma/prisma.service.js';
import { HealthModule } from './health/health.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { AccountsModule } from './accounts/accounts.module.js';
import { AuthModule } from './auth/auth.module.js';
import { LoyaltyModule } from './loyalty/loyalty.module.js';
import { AuditModule } from './audit/audit.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Transacción ambiente (ver src/prisma/prisma-transaction-runner.ts)
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [PrismaModule],
          adapter: new TransactionalAdapterPrisma({
            prismaInjectionToken: PrismaService,
          }),
        }),
      ],
    }),
    // Eventos de dominio entre módulos (ver src/shared/events/domain-events.ts).
    // Sin opciones a propósito: `async` o `nextTick` sacarían a los listeners de la
    // transacción de quien publica.
    EventEmitterModule.forRoot(),
    PrismaModule,
    HealthModule,
    CustomersModule,
    EmployeesModule,
    AccountsModule,
    AuthModule,
    LoyaltyModule,
    AuditModule,
  ],
})
export class AppModule {}
