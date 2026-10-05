import { forwardRef, Module } from '@nestjs/common';
import { EmployeesController } from './http/employees.controller.js';
import { EmployeesService } from './application/employees.service.js';
import { EmployeeRepository } from './domain/port/employee.repository.js';
import { EmployeePrismaRepository } from './infrastructure/employees.repository.js';
import { CustomersModule } from '../customers/customers.module.js';
import { AccountsModule } from '../accounts/accounts.module.js';

@Module({
  // forwardRef: CustomersModule importa EmployeesModule en sentido inverso (unicidad
  // global de email entre Employee y Customer, ver EmployeesService/CustomersService).
  // AccountsModule también importa EmployeesModule en sentido inverso (AccountsService
  // depende de EmployeesService para leer Employee.role/email/isActive).
  imports: [forwardRef(() => CustomersModule), forwardRef(() => AccountsModule)],
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    // Vincular el puerto con su implementación en Prisma
    {
      provide: EmployeeRepository,
      useClass: EmployeePrismaRepository,
    },
  ],
  exports: [EmployeesService],
})
export class EmployeesModule {}
