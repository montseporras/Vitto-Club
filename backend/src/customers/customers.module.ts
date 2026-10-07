import { Module } from '@nestjs/common';
import { CustomersController } from './http/customers.controller.js';
import { CustomersService } from './application/customers.service.js';
import { CustomerRepository } from './domain/port/customer.repository.js';
import { CustomerPrismaRepository } from './infrastructure/customers.repository.js';
import { EmployeesModule } from '../employees/employees.module.js';

// Sin forwardRef: EmployeesModule ya no importa CustomersModule (Customers -> Employees es
// la única dirección, ver CustomersService). Import plano.
@Module({
  imports: [EmployeesModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    // Vincular la abstracción (puerto) con la implementación en memoria (adaptador)
    {
      provide: CustomerRepository,
      useClass: CustomerPrismaRepository,
    },
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
