import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Customer } from '../domain/customer';
import { CustomerRepository, CustomerListParams, CustomerListResult } from '../domain/port/customer.repository';
import { CreateCustomerDto } from '../http/dto/create-customer.dto';
import { UpdateCustomerDto } from '../http/dto/update-customer.dto';
import { CustomerAlreadyExists } from '../domain/errors/customer-already-exists.error';
import { Mail } from '../domain/mail';

@Injectable()
export class CustomersService {
  constructor(
    private readonly customersRepository: CustomerRepository,
  ) {}

  // --- CREAR ---
  async create(dto: CreateCustomerDto): Promise<Customer> {


    // 1. Instanciar el Customer
    const customer = Customer.create(
      dto.name,
      dto.lastName,
      dto.phone,
      dto.mail,
    );

    // 2. Verificar que el mail no esté ya en uso
    const mailTaken = await this.customersRepository.existsByMail(customer.getMail());
    if (mailTaken) {
      throw new ConflictException(new CustomerAlreadyExists(customer.getMail()).message);
    }

    // 3. Persistir
    return await this.customersRepository.save(customer);
  }

  // --- LISTAR TODOS ---
  async findAll(): Promise<Customer[]> {
    return await this.customersRepository.findAll();
  }

  // --- LISTADO PAGINADO ---
  async list(params: CustomerListParams): Promise<CustomerListResult> {
    if (params.page < 1 || params.limit < 1) {
      throw new BadRequestException('page and limit must be positive integers');
    }
    return await this.customersRepository.list(params);
  }

  // --- BUSCAR POR ID ---
  async findById(id: number): Promise<Customer> {
    const customer = await this.customersRepository.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  // --- ACTUALIZAR ---
  async update(id: number, dto: UpdateCustomerDto): Promise<Customer> {
    // 1. Buscar si el cliente existe
    const customer = await this.findById(id);

    // 2. Verificar que el nuevo mail (si cambia) no esté ya en uso
    if (dto.mail !== undefined) {
      const normalizedMail = Mail.create(dto.mail).getValue();
      const mailTaken = await this.customersRepository.existsByMail(
        normalizedMail,
        customer.getId() ?? undefined,
      );
      if (mailTaken) {
        throw new ConflictException(new CustomerAlreadyExists(normalizedMail).message);
      }
    }

    // 3. Aplicar los cambios sobre la entidad recuperada
    customer.update(
      dto.name ?? customer.getName(),
      dto.lastName ?? customer.getLastName(),
      dto.phone ?? customer.getPhone(),
      dto.mail ?? customer.getMail(),
    );

    // 4. Re-persistir los cambios en el repositorio
    await this.customersRepository.update(customer);

    return customer;
  }

  // --- DESACTIVAR (BAJA LÓGICA) ---
  async deactivate(id: number): Promise<void> {
    const customer = await this.findById(id);
    customer.deactivate();
    await this.customersRepository.update(customer);
  }

  // --- ACTIVAR ---
  async activate(id: number): Promise<void> {
    const customer = await this.findById(id);
    customer.activate();
    await this.customersRepository.update(customer);
  }
}