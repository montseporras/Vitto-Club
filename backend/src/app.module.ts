import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { LoyaltyModule } from './loyalty/loyalty.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    CustomersModule,
    EmployeesModule,
    LoyaltyModule,
  ],
})
export class AppModule {}
