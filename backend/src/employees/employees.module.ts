import { Module } from '@nestjs/common';
import { EmployeesController } from './http/employees.controller.js';
import { EmployeesService } from './application/employees.service.js';
import { EmployeeRepository } from './domain/port/employee.repository.js';
import { EmployeePrismaRepository } from './infrastructure/employees.repository.js';

@Module({
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
