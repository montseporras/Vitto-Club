import { Module } from '@nestjs/common';
import { CustomersController } from './http/customers.controller.js';
import { CustomersService } from './application/customers.service.js';
import { CustomerRepository } from './domain/port/customer.repository.js';
import { CustomerPrismaRepository } from './infrastructure/customers.repository.js';



@Module({

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
