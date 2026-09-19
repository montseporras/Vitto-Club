import { Injectable, NotFoundException } from "@nestjs/common";
import { Customer } from "../domain/customer";
import { CustomerRepository, CustomerListParams, CustomerListResult } from "../domain/port/customer.repository";

@Injectable()

export class CustomerInMemoryRepository implements CustomerRepository {
    // Creo un mapeo de los Clientes
    private readonly customers: Map<number, Customer> = new Map();

    private autoIncrementId = 1;

        async save(customer: Customer): Promise<Customer> {
        const generatedId = this.autoIncrementId++;
        const savedCustomer = Customer.reconstruct(
        generatedId,
        customer.getName(),
        customer.getLastName(),
        customer.getPhone(),
        customer.getMail(),
        customer.isActive(),
        customer.getCreatedAt(),
        customer.getUpdatedAt(),
      );

      this.customers.set(generatedId, savedCustomer);
      return savedCustomer;
    }

    async findById(id: number): Promise<Customer | null> {
        const customer = this.customers.get(id);
        return customer || null;
    }

    async findAll(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async update(customer: Customer): Promise<void> {
  const id = customer.getId();

  if (!id || !this.customers.has(id)) {
    throw new NotFoundException(`Customer with ID ${id} not found`);
  }

  this.customers.set(id, customer);
}

  async existsByMail(mail: string, excludeId?: number): Promise<boolean> {
    return Array.from(this.customers.values()).some(
      (customer) => customer.getMail() === mail && customer.getId() !== excludeId,
    );
  }

  async list(params: CustomerListParams): Promise<CustomerListResult> {
    const { page, limit, nameContains, active } = params;

    let items = Array.from(this.customers.values());


    if (active !== undefined) {
      items = items.filter((customer) => customer.isActive() === active);
    }

    if (nameContains) {
      const needle = nameContains.toLowerCase();
      items = items.filter(
        (customer) =>
          customer.getName().toLowerCase().includes(needle) ||
          customer.getLastName().toLowerCase().includes(needle),
      );
    }

    const total = items.length;
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    return { items: paged, total };
  }

}