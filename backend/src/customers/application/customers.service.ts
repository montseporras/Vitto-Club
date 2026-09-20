import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Customer, DocumentType, normalizeDocumentNumber } from '../domain/customer.js';
import { CustomerRepository, CustomerListParams, CustomerListResult } from '../domain/port/customer.repository.js';
import { CreateCustomerDto } from '../http/dto/create-customer.dto.js';
import { UpdateCustomerDto } from '../http/dto/update-customer.dto.js';
import { CustomerAlreadyExists } from '../domain/errors/customer-already-exists.error.js';


@Injectable()
export class CustomersService {
  constructor(
    private readonly customersRepository: CustomerRepository,
  ) {}

  // --- CREAR ---
  async create(dto: CreateCustomerDto): Promise<Customer> {
    // 1. Instanciar el Customer (valida y normaliza)
    const customer = Customer.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
    });

    // 2. Verificar que el documento no esté ya registrado
    await this.assertDocumentAvailable(
      customer.getDocumentType(),
      customer.getDocumentNumber(),
    );

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

    // Un cliente dado de baja no se modifica: primero hay que reactivarlo
    if (!customer.isActive()) {
      throw new ConflictException(`Customer with ID ${id} is inactive: reactivate it before modifying`);
    }

    // 2. Si cambia el documento, verificar que no esté en uso (antes de mutar la entidad)
    if (dto.documentType !== undefined || dto.documentNumber !== undefined) {
      const documentType = dto.documentType ?? customer.getDocumentType();
      const documentNumber =
        dto.documentNumber !== undefined
          ? normalizeDocumentNumber(dto.documentNumber)
          : customer.getDocumentNumber();

      await this.assertDocumentAvailable(documentType, documentNumber, customer.getId() ?? undefined);
    }

    // 3. Aplicar los cambios sobre la entidad recuperada
    customer.update({
      
      firstName: dto.firstName,
      lastName: dto.lastName,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth:
        dto.dateOfBirth === undefined
          ? undefined
          : dto.dateOfBirth === null
            ? null
            : new Date(dto.dateOfBirth),
    });

    // 4. Re-persistir los cambios en el repositorio
    await this.customersRepository.update(customer);

    return customer;
  }

  // --- DESACTIVAR (BAJA LÓGICA) ---
  async deactivate(id: number): Promise<void> {
    const customer = await this.findById(id);
    if (!customer.isActive()) {
      throw new ConflictException(`Customer with ID ${id} is already inactive`);
    }
    customer.deactivate();
    await this.customersRepository.update(customer);
  }

  // --- ACTIVAR ---
  async activate(id: number): Promise<void> {
    const customer = await this.findById(id);
    if (customer.isActive()) {
      throw new ConflictException(`Customer with ID ${id} is already active`);
    }
    customer.activate();
    await this.customersRepository.update(customer);
  }


  private async assertDocumentAvailable(
    documentType: DocumentType,
    documentNumber: string,
    excludeId?: number,
  ): Promise<void> {
    const taken = await this.customersRepository.existsByDocument(documentType, documentNumber, excludeId);
    if (taken) {
      throw new ConflictException(new CustomerAlreadyExists(documentType, documentNumber).message);
    }
  }
}
