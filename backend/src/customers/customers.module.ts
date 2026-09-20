import { Module } from '@nestjs/common';
import { CustomersController } from './http/customers.controller';
import { CustomersService } from './application/customers.service';
import { CustomerRepository } from './domain/port/customer.repository';
import { CustomerPrismaRepository } from './infrastructure/customers.repository';


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
