import { Injectable } from '@nestjs/common';
import { CustomerQuery } from '../../factory/domain/port/customer-query.port';
import { CustomerRepository } from '../domain/port/customer.repository';


@Injectable()
export class CustomerQueryAdapter implements CustomerQuery {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async hasActiveCustomersForFactory(factoryId: number): Promise<boolean> {
    const { total } = await this.customerRepository.list({
      page: 1, // "No necesito que me devuelvas todos los clientes. Solo necesito saber si existe al menos uno."
      limit: 1,
      active: true,
    });

    return total > 0;
  }
}