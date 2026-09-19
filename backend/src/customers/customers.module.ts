import { Module, forwardRef } from '@nestjs/common';
import { CustomersController } from './http/customers.controller';
import { CustomersService } from './application/customers.service';
import { CustomerRepository } from './domain/port/customer.repository';
import { CustomerInMemoryRepository } from './infrastructure/customers.repository';
import { CustomerQuery } from '../factory/domain/port/customer-query.port';
import { CustomerQueryAdapter } from './infrastructure/customer-query.adapter';


@Module({

  controllers: [CustomersController],
  providers: [
    CustomersService,
    // Vincular la abstracción (puerto) con la implementación en memoria (adaptador)
    {
      provide: CustomerRepository,
      useClass: CustomerInMemoryRepository,
    },
    // Adaptador del puerto CustomerQuery, consumido por FactoryModule, "Cuando alguien pida CustomerQuery, entregale un CustomerQueryAdapter."
    {
      provide: CustomerQuery,
      useClass: CustomerQueryAdapter,
    },
  ],
  exports: [CustomersService, CustomerQuery],
})
export class CustomersModule {}
