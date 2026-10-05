import { forwardRef, Module } from '@nestjs/common';
import { CustomersController } from './http/customers.controller.js';
import { CustomersService } from './application/customers.service.js';
import { CustomerRepository } from './domain/port/customer.repository.js';
import { CustomerPrismaRepository } from './infrastructure/customers.repository.js';
import { EmployeesModule } from '../employees/employees.module.js';



@Module({
  // forwardRef: EmployeesModule importa CustomersModule en sentido inverso (unicidad
  // global de email entre Employee y Customer, ver CustomersService/EmployeesService).
  imports: [forwardRef(() => EmployeesModule)],
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
